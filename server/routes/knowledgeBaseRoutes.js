import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { Document } from '../models/Document.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { processDocument } from '../services/knowledgeBase/documentProcessor.js';
import { getEmbedding, cosineSimilarity } from '../services/knowledgeBase/vectorSearch.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { BadRequestError, NotFoundError, AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkLimit } from '../services/billing/usageLimitService.js';

const router = Router();

// Multer Storage Configuration (keep file in memory for downstream processing)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and Word (.docx) files are accepted.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB size limit
  fileFilter
});

// Multer Error Interceptor Middleware
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('File size exceeds the 20MB limit.', 'LIMIT_FILE_SIZE'));
      }
      return next(new BadRequestError(`Multer upload error: ${err.message}`, 'FILE_UPLOAD_ERROR'));
    } else if (err) {
      return next(new BadRequestError(err.message, 'INVALID_FILE'));
    }
    next();
  });
};

/**
 * POST /api/knowledge-base/upload
 * Protected. Accepts PDF/DOCX file up to 20MB, creates a Document as pending,
 * and starts background ingestion.
 */
router.post('/upload', protect, uploadMiddleware, asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError('No document file uploaded.', 'MISSING_FILE');
  }

  // Gating: check documents count limit
  const limitCheck = await checkLimit(req.user.companyId, 'maxKnowledgeBaseDocs');
  if (!limitCheck.allowed) {
    throw new AppError(limitCheck.message, 402, 'LIMIT_EXCEEDED');
  }

  // Resolve sourceType
  let sourceType = 'pdf';
  if (
    req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    req.file.mimetype === 'application/msword'
  ) {
    sourceType = 'docx';
  }

  // Create pending Document (scoped to tenant companyId via tenantPlugin)
  const document = await Document.create({
    title: req.file.originalname,
    sourceType,
    originalFileName: req.file.originalname,
    status: 'pending'
  });

  const companyId = req.companyId;
  const documentId = document._id;
  const fileBuffer = req.file.buffer;
  const mimeType = req.file.mimetype;

  // Fork async processing thread preserving tenant context
  runWithTenant(companyId, () => {
    processDocument(documentId, fileBuffer, mimeType).catch((err) => {
      process.stderr.write(`Async processing failure for Document ${documentId}: ${err.message}\n`);
    });
  });

  res.status(202).json({
    success: true,
    message: 'File upload successful. Chunking and indexing started in the background.',
    data: {
      id: document._id,
      title: document.title,
      status: document.status
    }
  });
}));

/**
 * GET /api/knowledge-base/
 * Protected. Lists all documents associated with the active tenant company.
 */
router.get('/', protect, asyncHandler(async (req, res) => {
  // Scoped automatically to companyId via tenantPlugin
  const documents = await Document.find().sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    data: documents
  });
}));

/**
 * DELETE /api/knowledge-base/:id
 * Protected. Cascade deletes the Document and associated DocumentChunks.
 */
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify document exists and belongs to company (plugin handles checks)
  const document = await Document.findById(id);
  if (!document) {
    throw new NotFoundError('Document not found in this company workspace.', 'DOCUMENT_NOT_FOUND');
  }

  // Delete all vector chunks (scoping applied automatically)
  await DocumentChunk.deleteMany({ documentId: id });

  // Delete Document metadata
  await Document.deleteOne({ _id: id });

  res.status(200).json({
    success: true,
    message: 'Document and indexed text chunks successfully purged.'
  });
}));

/**
 * POST /api/knowledge-base/query
 * Protected. Query knowledge base using semantic cosine similarity.
 */
router.post('/query', protect, asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    throw new BadRequestError('Query question is required.', 'MISSING_QUESTION');
  }

  // 1. Generate search query embedding
  const queryVector = await getEmbedding(question);

  // 2. Fetch all chunks belonging to company (scoped automatically via plugin)
  const chunks = await DocumentChunk.find().populate('documentId');

  // 3. Filter out chunks with missing document link or inactive state
  const activeChunks = chunks.filter(
    (chunk) => chunk.documentId && chunk.documentId.status === 'indexed'
  );

  if (activeChunks.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No indexed documents found in knowledge base. Please upload documents first.',
      data: []
    });
  }

  // 4. Calculate similarities
  const matches = activeChunks.map((chunk) => {
    const score = cosineSimilarity(queryVector, chunk.embedding);
    return {
      chunkId: chunk._id,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      similarity: score,
      documentTitle: chunk.documentId.title
    };
  });

  // 5. Sort matches by similarity score descending and return top 5
  matches.sort((a, b) => b.similarity - a.similarity);
  const topMatches = matches.slice(0, 5);

  res.status(200).json({
    success: true,
    message: 'Semantic query executed successfully.',
    data: topMatches
  });
}));

export default router;
