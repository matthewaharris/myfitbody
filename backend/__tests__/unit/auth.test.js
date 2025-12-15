/**
 * Unit Tests for Auth Middleware
 *
 * Tests the requireAuth middleware including:
 * - Missing credentials
 * - User lookup/creation
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock the supabase utilities
const mockCreateOrGetUser = jest.fn();

jest.unstable_mockModule('../../src/utils/supabase.js', () => ({
  getUserByClerkId: jest.fn(),
  createOrGetUser: mockCreateOrGetUser,
  supabase: {},
}));

// Import after mocking
const { requireAuth } = await import('../../src/middleware/auth.js');

// Helper to create mock request/response objects
function createMockReqRes(headers = {}) {
  const req = {
    headers: {
      'x-clerk-user-id': headers.clerkUserId,
      'x-user-email': headers.email,
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
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requireAuth middleware', () => {

  // -------------------------------------------------------------------------
  // Missing Credentials Tests
  // -------------------------------------------------------------------------

  test('returns 401 when no clerk user ID provided', async () => {
    const { req, res, next } = createMockReqRes({});

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized - No user ID provided',
    });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Successful Authentication Tests
  // -------------------------------------------------------------------------

  test('attaches user to request and calls next on success', async () => {
    const mockUser = {
      id: 'uuid-123',
      clerk_user_id: 'clerk_abc',
      email: 'test@example.com',
    };

    mockCreateOrGetUser.mockResolvedValue(mockUser);

    const { req, res, next } = createMockReqRes({
      clerkUserId: 'clerk_abc',
      email: 'test@example.com',
    });

    await requireAuth(req, res, next);

    expect(mockCreateOrGetUser).toHaveBeenCalledWith('clerk_abc', 'test@example.com');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('works without email (optional field)', async () => {
    const mockUser = {
      id: 'uuid-123',
      clerk_user_id: 'clerk_abc',
    };

    mockCreateOrGetUser.mockResolvedValue(mockUser);

    const { req, res, next } = createMockReqRes({
      clerkUserId: 'clerk_abc',
    });

    await requireAuth(req, res, next);

    expect(mockCreateOrGetUser).toHaveBeenCalledWith('clerk_abc', undefined);
    expect(next).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // User Not Found Tests
  // -------------------------------------------------------------------------

  test('returns 401 when user not found', async () => {
    mockCreateOrGetUser.mockResolvedValue(null);

    const { req, res, next } = createMockReqRes({
      clerkUserId: 'clerk_nonexistent',
    });

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
    mockCreateOrGetUser.mockRejectedValue(new Error('Database connection failed'));

    const { req, res, next } = createMockReqRes({
      clerkUserId: 'clerk_abc',
      email: 'test@example.com',
    });

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
    mockCreateOrGetUser.mockRejectedValue(error);

    const { req, res, next } = createMockReqRes({
      clerkUserId: 'clerk_abc',
    });

    await requireAuth(req, res, next);

    expect(consoleSpy).toHaveBeenCalledWith('Auth middleware error:', error);
  });
});
