/**
 * OpenAPI specification + Swagger UI (spec §52).
 *
 * Mounted at /api/docs (UI) and /api/openapi.json (raw spec). The document is
 * hand-authored to match the real envelopes and routes; it is the contract the
 * frontend and external integrators build against.
 */
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'OnionSure Backend API',
    version: '1.0.0',
    description:
      'AI + IoT + Computer Vision onion quality assessment & digital certification platform. ' +
      'All responses use the envelope { success, data } / { success, error }.',
  },
  servers: [
    { url: `http://localhost:${env.PORT}/api/v1`, description: 'Canonical versioned API' },
    { url: `http://localhost:${env.PORT}/api`, description: 'Legacy alias (same handlers)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'officer1' },
          password: { type: 'string', example: 'password123' },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { type: 'object' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Liveness probe',
        security: [],
        responses: { '200': { description: 'Service healthy' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate and receive tokens',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tokens' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Exchange a refresh token for a new pair',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'OK' }, '401': { description: 'Invalid refresh token' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current user profile',
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a user (ADMIN only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { '201': { description: 'Created' }, '403': { description: 'Forbidden' } },
      },
    },
    '/lots': {
      get: { summary: 'List lots (role-scoped, paginated)', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create a lot (OFFICER/ADMIN)', responses: { '201': { description: 'Created' } } },
    },
    '/inspections': {
      get: { summary: 'List inspections (role-scoped)', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create an inspection (OFFICER/ADMIN)', responses: { '201': { description: 'Created' } } },
    },
    '/inspections/{id}/analyze': {
      post: { summary: 'Run vision + gas AI analysis (CAPTURED→FUSION_PROCESSING)', responses: { '200': { description: 'OK' }, '409': { description: 'Invalid state transition' } } },
    },
    '/inspections/{id}/fuse': {
      post: { summary: 'Fuse multimodal results and grade (FUSION_PROCESSING→GRADED)', responses: { '200': { description: 'OK' } } },
    },
    '/inspections/{id}/certificate': {
      post: { summary: 'Issue a digital certificate (GRADED→CERTIFICATE_GENERATED)', responses: { '200': { description: 'OK' } } },
    },
    '/config/fusion': {
      get: { summary: 'Active fusion configuration (ADMIN)' },
      put: { summary: 'Create a new active fusion version (ADMIN)' },
    },
    '/config/grading': {
      get: { summary: 'Active grading thresholds (ADMIN)' },
      put: { summary: 'Update grading thresholds (ADMIN)' },
    },
    '/analytics/dashboard': {
      get: { summary: 'Role-aware dashboard (backend-derived)' },
    },
    '/certificates': {
      get: { summary: 'List certificates' },
    },
    '/public/verify/{token}': {
      get: {
        summary: 'Public certificate verification (no auth)',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/openapi.json', (_req, res) => {
    res.json(spec);
  });
}
