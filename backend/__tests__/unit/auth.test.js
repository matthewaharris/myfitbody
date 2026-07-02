/**
 * Unit Tests for Auth Middleware
 *
 * Tests the requireAuth middleware including:
 * - Missing/invalid bearer tokens
 * - User lookup/link/creation via getOrLinkUserByAuthId
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock the supabase utilities
const mockGetOrLinkUserByAuthId = jest.fn();
const mockGetUser = jest.fn();

jest.unstable_mockModule('../../src/utils/supabase.js', () => ({
  getOrLinkUserByAuthId: mockGetOrLinkUserByAuthId,
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
  },
}));

// Import after mocking
const { requireAuth } = await import('../../src/middleware/auth.js');

// Helper to create mock request/response objects
function createMockReqRes(token) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const next = jest.fn();

  return { req, res, next };
}

const validAuthUser = { id: 'auth-uuid-123', email: 'test@example.com' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requireAuth middleware', () => {

  // -------------------------------------------------------------------------
  // Missing/Invalid Credentials Tests
  // -------------------------------------------------------------------------

  test('returns 401 when no bearer token provided', async () => {
    const { req, res, next } = createMockReqRes(null);

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized - No token provided',
    });
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is invalid or expired', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    });

    const { req, res, next } = createMockReqRes('bad-token');

    await requireAuth(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('bad-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized - Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Successful Authentication Tests
  // -------------------------------------------------------------------------

  test('attaches user to request and calls next on success', async () => {
    const mockUser = {
      id: 'uuid-123',
      auth_user_id: 'auth-uuid-123',
      email: 'test@example.com',
    };

    mockGetUser.mockResolvedValue({ data: { user: validAuthUser }, error: null });
    mockGetOrLinkUserByAuthId.mockResolvedValue(mockUser);

    const { req, res, next } = createMockReqRes('good-token');

    await requireAuth(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('good-token');
    expect(mockGetOrLinkUserByAuthId).toHaveBeenCalledWith('auth-uuid-123', 'test@example.com');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('works without email (optional field)', async () => {
    const mockUser = {
      id: 'uuid-123',
      auth_user_id: 'auth-uuid-123',
    };

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-uuid-123' } },
      error: null,
    });
    mockGetOrLinkUserByAuthId.mockResolvedValue(mockUser);

    const { req, res, next } = createMockReqRes('good-token');

    await requireAuth(req, res, next);

    expect(mockGetOrLinkUserByAuthId).toHaveBeenCalledWith('auth-uuid-123', undefined);
    expect(next).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // User Not Found Tests
  // -------------------------------------------------------------------------

  test('returns 401 when user not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: validAuthUser }, error: null });
    mockGetOrLinkUserByAuthId.mockResolvedValue(null);

    const { req, res, next } = createMockReqRes('good-token');

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized - User not found',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Error Handling Tests
  // -------------------------------------------------------------------------

  test('returns 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: validAuthUser }, error: null });
    mockGetOrLinkUserByAuthId.mockRejectedValue(new Error('Database connection failed'));

    const { req, res, next } = createMockReqRes('good-token');

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication failed',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('logs error on failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Test error');
    mockGetUser.mockResolvedValue({ data: { user: validAuthUser }, error: null });
    mockGetOrLinkUserByAuthId.mockRejectedValue(error);

    const { req, res, next } = createMockReqRes('good-token');

    await requireAuth(req, res, next);

    expect(consoleSpy).toHaveBeenCalledWith('Auth middleware error:', error);
  });
});
