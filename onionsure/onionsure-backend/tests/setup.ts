/**
 * Vitest setup — guarantees a valid runtime environment before any module that
 * imports `src/config/env` is loaded. These values satisfy env validation so
 * the pure-logic unit tests (fusion / grading / state machine / tokens) never
 * touch a database.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
// Only set DATABASE_URL if not already provided (integration tests need a real DB)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/onionsure_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'unit-test-refresh-secret-0123456789abcdef';
process.env.AI_MODE = process.env.AI_MODE || 'MOCK';
