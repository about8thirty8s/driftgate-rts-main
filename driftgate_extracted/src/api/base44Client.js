import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "69c50800b7803bc24570e607", 
  requiresAuth: true // Ensure authentication is required for all operations
});
