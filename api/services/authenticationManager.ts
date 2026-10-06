import { Buffer } from 'node:buffer';
import type { ApiAuthentication } from '../utils/apiClient';
import type { ApiClient } from '../utils/apiClient';

export class AuthenticationManager {
  static async login(client: ApiClient, username: string, password: string): Promise<void> {
    if (!username.trim() || !password) {
      throw new Error('ParaBank username and password are required to establish an API session.');
    }
    const response = await client.post('/parabank/login.htm', {
      form: { username: username.trim(), password },
      rootPath: true,
      maxRedirects: 0,
      expectedStatus: 302
    });
    const location = response.headers().location ?? '';
    if (!/\/overview\.htm(?:;|[?#]|$)/i.test(location)) {
      throw new Error('ParaBank login did not redirect to the account overview; verify the configured credentials.');
    }
  }

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
