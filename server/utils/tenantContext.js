import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage holds the tenant (Company ID) context for active asynchronous invocations
export const tenantLocalStorage = new AsyncLocalStorage();

/**
 * Runs a function within the scope of a specific tenant ID.
 * @param {string} tenantId - The active Company ObjectId
 * @param {Function} callback - The next middleware or operation
 */
export const runWithTenant = (tenantId, callback) => {
  return tenantLocalStorage.run(tenantId, callback);
};

/**
 * Retrieves the tenant ID for the current execution context.
 * @returns {string|null} The active Company ID or null if unassigned
 */
export const getTenantId = () => {
  return tenantLocalStorage.getStore();
};
