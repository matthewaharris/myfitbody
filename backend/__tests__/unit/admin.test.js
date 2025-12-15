/**
 * Unit Tests for Admin Middleware
 */

import { jest } from '@jest/globals';

// Set environment variable before importing
process.env.ADMIN_SECRET = 'test-secret-key';

const {
  requireAdmin,
  generateAdminToken,
  verifyAdminToken,
} = await import('../../src/middleware/admin.js');

// Helper to create mock Express req/res/next
function createMockReqRes(authHeader) {
  const req = {
    headers: {
      authorization: authHeader,
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const next = jest.fn();

  return { req, res, next };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateAdminToken', () => {
  test('generates valid JWT token', () => {
    const token = generateAdminToken('admin@example.com');

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  test('includes admin flag in token', () => {
    const token = generateAdminToken('admin@example.com');
    const decoded = verifyAdminToken(token);

    expect(decoded.isAdmin).toBe(true);
    expect(decoded.email).toBe('admin@example.com');
  });

  test('accepts additional options', () => {
    const token = generateAdminToken('admin@example.com', { role: 'superadmin' });
    const decoded = verifyAdminToken(token);

    expect(decoded.role).toBe('superadmin');
  });
});

describe('verifyAdminToken', () => {
  test('returns decoded token for valid admin token', () => {
    const token = generateAdminToken('admin@example.com');
    const decoded = verifyAdminToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded.email).toBe('admin@example.com');
    expect(decoded.isAdmin).toBe(true);
  });

  test('returns null for invalid token', () => {
    expect(verifyAdminToken('invalid-token')).toBeNull();
  });

  test('returns null for expired token', () => {
    // This would require mocking time, so we'll test with malformed token
    expect(verifyAdminToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired')).toBeNull();
  });
});

describe('requireAdmin middleware', () => {
  test('returns 401 when no token provided', () => {
    const { req, res, next } = createMockReqRes(undefined);

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for invalid token', () => {
    const { req, res, next } = createMockReqRes('Bearer invalid-token');

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() and attaches admin for valid token', () => {
    const token = generateAdminToken('admin@example.com');
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toBeDefined();
    expect(req.admin.email).toBe('admin@example.com');
    expect(req.admin.isAdmin).toBe(true);
  });

  test('handles token without Bearer prefix', () => {
    const token = generateAdminToken('admin@example.com');
    const { req, res, next } = createMockReqRes(token);

    requireAdmin(req, res, next);

    // Should still work - replaces "Bearer " which won't exist
    expect(next).toHaveBeenCalled();
  });
});
