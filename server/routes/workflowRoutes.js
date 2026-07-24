import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { WorkflowRule } from '../models/WorkflowRule.js';
import { WorkflowLog } from '../models/WorkflowLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, NotFoundError, AppError } from '../utils/errors.js';
import { checkLimit } from '../services/billing/usageLimitService.js';

const router = Router();

/**
 * GET /api/workflows
 * Lists all workflow rules for the company.
 */
router.get('/', protect, asyncHandler(async (req, res) => {
  const rules = await WorkflowRule.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: rules
  });
}));

/**
 * POST /api/workflows
 * Creates a new workflow rule.
 */
router.post('/', protect, asyncHandler(async (req, res) => {
  const { name, trigger, isActive, actions } = req.body;

  // Gating: check workflow rules limit
  const limitCheck = await checkLimit(req.user.companyId, 'maxWorkflowRules');
  if (!limitCheck.allowed) {
    throw new AppError(limitCheck.message, 402, 'LIMIT_EXCEEDED');
  }

  if (!name) {
    throw new BadRequestError('Workflow rule name is required.', 'MISSING_NAME');
  }

  const newRule = await WorkflowRule.create({
    name,
    trigger: trigger || 'conversation_ended',
    isActive: isActive !== undefined ? isActive : true,
    actions: actions || []
  });

  res.status(201).json({
    success: true,
    message: 'Workflow rule created successfully.',
    data: newRule
  });
}));

/**
 * PATCH /api/workflows/:id
 * Updates an existing workflow rule.
 */
router.patch('/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, trigger, isActive, actions } = req.body;

  const rule = await WorkflowRule.findById(id);
  if (!rule) {
    throw new NotFoundError('Workflow rule not found in this workspace.', 'RULE_NOT_FOUND');
  }

  if (name !== undefined) rule.name = name;
  if (trigger !== undefined) rule.trigger = trigger;
  if (isActive !== undefined) rule.isActive = isActive;
  if (actions !== undefined) rule.actions = actions;

  await rule.save();

  res.status(200).json({
    success: true,
    message: 'Workflow rule updated successfully.',
    data: rule
  });
}));

/**
 * DELETE /api/workflows/:id
 * Deletes a workflow rule.
 */
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rule = await WorkflowRule.findByIdAndDelete(id);
  if (!rule) {
    throw new NotFoundError('Workflow rule not found in this workspace.', 'RULE_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    message: 'Workflow rule deleted successfully.'
  });
}));

/**
 * GET /api/workflows/logs
 * Lists recent WorkflowLog entries (paginated, filterable by status).
 */
router.get('/logs', protect, asyncHandler(async (req, res) => {
  const statusFilter = req.query.status;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (statusFilter && statusFilter !== 'all') {
    query.status = statusFilter;
  }

  const logs = await WorkflowLog.find(query)
    .populate('conversationId')
    .populate('ruleId')
    .sort({ executedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await WorkflowLog.countDocuments(query);

  res.status(200).json({
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

export default router;
