import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const noteSchema = new mongoose.Schema(
  {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Contact reference is required'],
      index: true
    },
    authorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author user reference is required'],
      index: true
    },
    content: {
      type: String,
      required: [true, 'Note content content is required'],
      trim: true
    }
  },
  {
    timestamps: true // Auto adds createdAt and updatedAt
  }
);

// Register the tenant plugin to enforce scoped company checks automatically
noteSchema.plugin(tenantPlugin);

export const Note = mongoose.model('Note', noteSchema);
export default Note;
