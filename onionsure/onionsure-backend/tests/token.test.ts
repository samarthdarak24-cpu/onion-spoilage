import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../src/modules/auth/token.service';

describe('JWT tokens', () => {
  it('round-trips an access token', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'ADMIN' as never });
    const payload = verifyAccessToken(token);
    expect(payload?.sub).toBe('user-1');
    expect(payload?.role).toBe('ADMIN');
  });

  it('rejects a refresh token presented as an access token', () => {
    const refresh = signRefreshToken({ sub: 'user-1', typ: 'refresh' });
    expect(verifyAccessToken(refresh)).toBeNull();
  });

  it('round-trips a refresh token and rejects garbage', () => {
    const refresh = signRefreshToken({ sub: 'user-1', typ: 'refresh' });
    expect(verifyRefreshToken(refresh)?.sub).toBe('user-1');
    expect(verifyRefreshToken('not-a-token')).toBeNull();
  });
});
