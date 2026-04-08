import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage();

export const getTenantId = () => {
  const store = tenantContext.getStore();
  return store?.tenantId;
};
