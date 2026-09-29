import { Buffer } from 'node:buffer';
import type { ApiAuthentication } from '../apiClient';

export class AuthenticationManager {
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