import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Document } from '../../models/Document.js';
import { DocumentChunk } from '../../models/DocumentChunk.js';
import { getEmbedding } from './vectorSearch.js';

/**
 * Splits raw text into sentence-aware chunks of ~2000 characters (~500 tokens)
 * with ~200 characters (~50 tokens) overlap at the sentence boundaries.
 */
export const chunkText = (text, maxChunkSize = 2000, overlapSize = 200) => {
  if (!text) return [];

  // Match standard sentence terminators (. ! ?)
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      // Prepend previous sentences to form the overlap for the next chunk
      let overlap = '';
      let j = i - 1;
      while (j >= 0 && (overlap + sentences[j]).length < overlapSize) {
        overlap = sentences[j] + overlap;
        j--;
      }
      currentChunk = overlap + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

/**
 * Main async document parser and chunk indexer.
 * Operates safely within the active company's tenant context.
 */
export const processDocument = async (documentId, fileBuffer, mimeType) => {
  try {
    // 1. Update document status to processing
    const document = await Document.findById(documentId);
    if (!document) {
      process.stderr.write(`Error: Document ${documentId} not found in processor.\n`);
      return;
    }

    document.status = 'processing';
    await document.save();

    let rawText = '';

    // 2. Parse file content depending on mimeType
    if (mimeType === 'application/pdf') {
      const parsedPdf = await pdfParse(fileBuffer);
      rawText = parsedPdf.text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType === 'application/msword'
    ) {
      const parsedDocx = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = parsedDocx.value;
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (!rawText || !rawText.trim()) {
      throw new Error('Document content could not be extracted or is empty.');
    }

    // 3. Segment parsed text into chunks
    const chunks = chunkText(rawText);
    if (chunks.length === 0) {
      throw new Error('No chunks generated from the extracted text.');
    }

    // 4. Generate embeddings and save chunks sequentially
    for (let index = 0; index < chunks.length; index++) {
      const chunkText = chunks[index];
      
      // Call OpenAI API
      const embedding = await getEmbedding(chunkText);

      // Create DocumentChunk record (scoped under active companyId via plugin)
      await DocumentChunk.create({
        documentId: document._id,
        content: chunkText,
        embedding: embedding,
        chunkIndex: index
      });
    }

    // 5. Finalize document status
    document.status = 'indexed';
    document.chunkCount = chunks.length;
    await document.save();

  } catch (err) {
    process.stderr.write(`Document Ingestion Failure [DocID: ${documentId}]: ${err.message}\n`);
    
    // Attempt updating document status to failed
    try {
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
        errorDetail: err.message
      });
    } catch (dbErr) {
      process.stderr.write(`Failed to update failure status in DB: ${dbErr.message}\n`);
    }
  }
};
