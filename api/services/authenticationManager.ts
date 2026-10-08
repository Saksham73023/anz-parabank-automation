// Handles API authentication workflows, including ParaBank login validation
// and generation of authorization headers for supported authentication types
// (Bearer Token, Basic Authentication, and No Authentication).
import { Buffer } from 'node:buffer';
import type { ApiAuthentication } from '../utils/apiClient';
import type { ApiClient } from '../utils/apiClient';

/** Manages ParaBank session login and creates headers for supported API authentication modes. */
export class AuthenticationManager {
  /**
   * Logs in through ParaBank's web endpoint and verifies the redirect to account overview.
   * The API request context retains the session cookie for subsequent protected requests.
   * @param client Scenario-scoped API client.
   * @param username Configured ParaBank username.
   * @param password Configured ParaBank password.
   */
  static async login(client: ApiClient, username: string, password: string): Promise<void> {
    if (!username.trim() || !password) {
      throw new Error('ParaBank username and password are required to establish an API session.');
    }
    const response = await client.post('/parabank/login.htm', {
      form: { username: username.trim(), password },
      rootPath: true,
      maxRedirects: 0,
      rateLimitRetrySafe: true,
      expectedStatus: 302
    });
    const location = response.headers().location ?? '';
    if (!/\/overview\.htm(?:;|[?#]|$)/i.test(location)) {
      throw new Error('ParaBank login did not redirect to the account overview; verify the configured credentials.');
    }
  }

  /**
   * Converts an authentication configuration into request authorization headers.
   * @param authentication Selected none, bearer, or basic credentials.
   * @returns Authorization header map for the API request.
   */
  static toHeaders(authentication: ApiAuthentication): Record<string, string> {
    switch (authentication.type) {
      case 'bearer':
        return { Authorization: `Bearer ${authentication.token}` };
      case 'basic':
        return {
          Authorization: `Basic ${Buffer.from(`${authentication.username}:${authentication.password}`).toString('base64')}`
        };
      case 'none':
        return { Authorization: '' };
    }
  }
}
