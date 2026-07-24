import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    superadminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ['impersonate', 'suspend_company', 'reactivate_company', 'plan_override', 'extend_trial'],
      required: true
    },
    targetCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    details: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);
export default AdminAuditLog;
