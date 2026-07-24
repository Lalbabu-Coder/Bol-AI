import mongoose from 'mongoose';
import { getTenantId } from '../../utils/tenantContext.js';

export const tenantPlugin = (schema) => {
  // Inject companyId to every schema that uses this plugin
  schema.add({
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [
        function () {
          return this.role !== 'superadmin';
        },
        'Company ID is required for tenant isolation.'
      ],
      index: true
    }
  });

  // Hook into validation step (before save) to inject current tenant context automatically
  schema.pre('validate', function (next) {
    if (!this.companyId) {
      const tenantId = getTenantId();
      if (tenantId) {
        this.companyId = new mongoose.Types.ObjectId(tenantId);
      }
    }
    next();
  });

  // Intercept query hooks to filter findings by tenant context
  const queryHooks = [
    'find',
    'findOne',
    'countDocuments',
    'estimatedDocumentCount',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace'
  ];

  queryHooks.forEach((method) => {
    schema.pre(method, function (next) {
      const tenantId = getTenantId();
      if (tenantId) {
        const query = this.getQuery();
        
        // Apply companyId filter automatically if not explicitly provided in query
        if (query.companyId === undefined) {
          this.where({ companyId: new mongoose.Types.ObjectId(tenantId) });
        }
      }
      next();
    });
  });

  // Intercept aggregation pipelines to append a matching filter step
  schema.pre('aggregate', function (next) {
    const tenantId = getTenantId();
    if (tenantId) {
      const pipeline = this.pipeline();
      
      // Inject $match step at the start of the aggregate pipeline
      pipeline.unshift({
        $match: { companyId: new mongoose.Types.ObjectId(tenantId) }
      });
    }
    next();
  });
};
export default tenantPlugin;
