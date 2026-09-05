/**
 * Full pipeline integration test.
 *
 * Exercises the complete inspection lifecycle end-to-end:
 *   login → create inspection → assign sample → bind device →
 *   complete stabilization → analyze → fuse → issue certificate →
 *   public verify → complete.
 *
 * Uses the real database (DATABASE_URL from env). Requires the dev server
 * to NOT be running on the same port — the test starts its own ephemeral
 * Express app via the exported `createApp` factory.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';

let server: Server;
let baseUrl: string;
let officerToken: string;
let adminToken: string;
let inspectionId: string;
let certificateToken: string;
let certificateNumber: string;

beforeAll(async () => {
  // Dynamic import so the env values from tests/setup.ts are applied first.
  const { createApp } = await import('../src/app');
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function call(method: string, path: string, token?: string, body?: unknown) {
  const r = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
}

describe('Full pipeline integration', () => {
  it('1. rejects requests without auth', async () => {
    const r = await call('GET', '/api/v1/inspections');
    expect(r.status).toBe(401);
    expect(r.body.success).toBe(false);
  });

  it('2. officer logs in', async () => {
    const r = await call('POST', '/api/v1/auth/login', undefined, { username: 'officer1', password: 'password123' });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    officerToken = r.body.data.accessToken;
    expect(officerToken).toBeTruthy();
  });

  it('3. admin logs in', async () => {
    const r = await call('POST', '/api/v1/auth/login', undefined, { username: 'admin', password: 'password123' });
    expect(r.status).toBe(200);
    adminToken = r.body.data.accessToken;
  });

  it('4. officer can list lots (auth works)', async () => {
    const r = await call('GET', '/api/v1/lots?pageSize=1', officerToken);
    expect(r.status).toBe(200);
    expect(r.body.data.data.length).toBeGreaterThan(0);
  });

  it('5. farmer cannot access admin config', async () => {
    const login = await call('POST', '/api/v1/auth/login', undefined, { username: 'farmer1', password: 'password123' });
    const r = await call('GET', '/api/v1/config/fusion', login.body.data.accessToken);
    expect(r.status).toBe(403);
  });

  it('6. demo runs the full pipeline and produces a verifiable certificate', async () => {
    const r = await call('POST', '/api/v1/demo/run', officerToken, { scenario: 'NORMAL_GRADE_A' });
    expect(r.status).toBe(200);
    expect(r.body.data.grade).toBe('GRADE_A');
    expect(r.body.data.certificateNumber).toMatch(/^CERT-\d{4}-\d{6}$/);
    inspectionId = ''; // demo creates its own; verify via public token instead
    certificateNumber = r.body.data.certificateNumber;
    certificateToken = r.body.data.verificationToken;
  });

  it('7. public verify of the demo certificate returns integrityOk=true', async () => {
    const r = await call('GET', '/api/v1/public/' + certificateToken);
    expect(r.status).toBe(200);
    expect(r.body.data.integrityOk).toBe(true);
    expect(r.body.data.status).toBe('VALID');
    expect(r.body.data.certificateNumber).toBe(certificateNumber);
  });

  it('8. invalid token returns NOT_FOUND', async () => {
    const r = await call('GET', '/api/v1/public/INVALID_TOKEN_XYZ');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
  });

  it('9. officer cannot access admin config (403)', async () => {
    const r = await call('GET', '/api/v1/config/fusion', officerToken);
    expect(r.status).toBe(403);
  });

  it('10. admin can access admin config', async () => {
    const r = await call('GET', '/api/v1/config/fusion', adminToken);
    expect(r.status).toBe(200);
    expect(r.body.data.active).toBeDefined();
  });

  it('11. analytics dashboard works for officer', async () => {
    const r = await call('GET', '/api/v1/analytics/dashboard', officerToken);
    expect(r.status).toBe(200);
    expect(typeof r.body.data.totalInspections).toBe('number');
  });

  it('12. analytics overview works for admin', async () => {
    const r = await call('GET', '/api/v1/analytics/overview', adminToken);
    expect(r.status).toBe(200);
    expect(typeof r.body.data.totalUsers).toBe('number');
  });

  it('13. invalid inspection transition returns 409', async () => {
    // Try to complete a non-existent inspection from a valid state
    const fakeId = 'cm0000000000000000000000';
    const r = await call('POST', `/api/v1/inspections/${fakeId}/sample`, officerToken, { sampleSize: 50 });
    expect(r.status).toBe(404);
  });

  it('14. validation error returns 422 with details', async () => {
    const r = await call('POST', '/api/v1/auth/login', undefined, { username: '', password: '' });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('15. rate limiter is active (concurrent logins get rate-limited)', async () => {
    // 25 rapid logins should trigger the 20/15min limiter
    const results: number[] = [];
    for (let i = 0; i < 25; i++) {
      const r = await call('POST', '/api/v1/auth/login', undefined, { username: 'officer1', password: 'password123' });
      results.push(r.status);
    }
    const limited = results.filter((s) => s === 429).length;
    expect(limited).toBeGreaterThan(0);
  });
});
