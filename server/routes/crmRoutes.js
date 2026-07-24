import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { Contact } from '../models/Contact.js';
import { Note } from '../models/Note.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js'; // Required for author populate lookups
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateContactUpdate, validateNoteCreate } from '../middleware/validation.js';

const router = Router();

/**
 * GET /api/crm/contacts
 * Protected. Paginated retrieval of workspace contacts.
 * Query params: page, limit, leadStatus, search (matches name/email/phone), sort (createdAt/lastContactedAt)
 */
router.get('/contacts', protect, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Filter out soft-deleted contacts
  const filter = { isDeleted: false };

  // Status filter
  if (req.query.leadStatus) {
    filter.leadStatus = req.query.leadStatus;
  }

  // Text search filter (case-insensitive matches across name, email, or phone)
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }

  // Sort overrides (defaults to lastContactedAt DESC)
  const sortField = req.query.sort === 'createdAt' ? 'createdAt' : 'lastContactedAt';
  const sortOrder = -1; // Sorting is always descending for recent updates

  // Scoped automatically to current company via tenantPlugin
  const contacts = await Contact.find(filter)
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Contact.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: contacts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * GET /api/crm/contacts/:id
 * Protected. Fetches unified Contact details, linked conversations, and manual notes.
 */
router.get('/contacts/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find Contact (plugin checks companyId automatically)
  const contact = await Contact.findOne({ _id: id, isDeleted: false });
  if (!contact) {
    throw new NotFoundError('Contact not found in this company workspace.', 'CONTACT_NOT_FOUND');
  }

  // Find linked conversations (scoped via plugin)
  const conversations = await Conversation.find({ contactId: id }).sort({ updatedAt: -1 });

  // Find notes and populate user names (scoped via plugin)
  const notes = await Note.find({ contactId: id })
    .populate('authorUserId', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      contact,
      conversations,
      notes
    }
  });
}));

/**
 * PATCH /api/crm/contacts/:id
 * Protected. Manually updates Contact coordinates and tags.
 */
router.patch('/contacts/:id', protect, validateContactUpdate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, leadStatus, tags } = req.body;

  const contact = await Contact.findOne({ _id: id, isDeleted: false });
  if (!contact) {
    throw new NotFoundError('Contact not found in this company workspace.', 'CONTACT_NOT_FOUND');
  }

  // Update provided fields
  if (name !== undefined) contact.name = name;
  if (email !== undefined) contact.email = email;
  if (phone !== undefined) contact.phone = phone;
  if (leadStatus !== undefined) contact.leadStatus = leadStatus;
  if (tags !== undefined) contact.tags = tags;

  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Contact profile updated successfully.',
    data: contact
  });
}));

/**
 * POST /api/crm/contacts/:id/notes
 * Protected. Logs a manual annotation note.
 */
router.post('/contacts/:id/notes', protect, validateNoteCreate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new BadRequestError('Note content content cannot be empty.', 'MISSING_CONTENT');
  }

  const contact = await Contact.findOne({ _id: id, isDeleted: false });
  if (!contact) {
    throw new NotFoundError('Contact not found in this company workspace.', 'CONTACT_NOT_FOUND');
  }

  // Create Note record
  const note = await Note.create({
    contactId: id,
    authorUserId: req.user._id, // Set from auth protect middleware
    content: content.trim()
  });

  const populatedNote = await note.populate('authorUserId', 'name email');

  res.status(201).json({
    success: true,
    message: 'Annotation note saved successfully.',
    data: populatedNote
  });
}));

/**
 * DELETE /api/crm/contacts/:id
 * Protected. Soft-deletes a Contact profile by setting isDeleted to true.
 */
router.delete('/contacts/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const contact = await Contact.findOne({ _id: id, isDeleted: false });
  if (!contact) {
    throw new NotFoundError('Contact not found in this company workspace.', 'CONTACT_NOT_FOUND');
  }

  contact.isDeleted = true;
  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Contact soft-deleted successfully.'
  });
}));

export default router;
