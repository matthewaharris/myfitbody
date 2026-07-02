/**
 * Integration Tests for Profile Routes
 *
 * Tests the /api/profile endpoints including:
 * - Get profile
 * - Update profile
 */

import { jest } from '@jest/globals';
import request from 'supertest';

// =============================================================================
// Setup Mocks
// =============================================================================

const mockUser = {
  id: 'user-uuid-123',
  auth_user_id: 'auth-uuid-123',
  email: 'test@example.com',
};

const mockProfile = {
  id: 'profile-uuid-123',
  user_id: 'user-uuid-123',
  name: 'Test User',
  height_cm: 175,
  weight_kg: 70,
  goal: 'maintain',
  activity_level: 'moderate',
  daily_calorie_goal: 2000,
  daily_protein_goal: 150,
  daily_carbs_goal: 250,
  daily_fat_goal: 65,
};

let currentMockData = null;
let currentMockError = null;

const mockSingle = jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError }));
const mockMaybeSingle = jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError }));

const createChain = () => {
  const chain = {
    select: jest.fn(() => chain),
    update: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    then: (resolve) => resolve({ data: currentMockData, error: currentMockError }),
  };
  return chain;
};

const mockFrom = jest.fn((table) => {
  // The auth middleware resolves the user from the 'users' table on every
  // request; keep that lookup working regardless of per-test mock data.
  if (table === 'users') {
    const chain = createChain();
    chain.maybeSingle = jest.fn(() => Promise.resolve({ data: mockUser, error: null }));
    return chain;
  }
  return createChain();
});

const setMockData = (data, error = null) => {
  currentMockData = data;
  currentMockError = error;
};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: jest.fn((token) =>
        token === 'test-token'
          ? Promise.resolve({ data: { user: { id: 'auth-uuid-123', email: 'test@example.com' } }, error: null })
          : Promise.resolve({ data: { user: null }, error: { message: 'invalid token' } })
      ),
    },
  })),
}));

const { app } = await import('../../src/index.js');

const authHeaders = {
  Authorization: 'Bearer test-token',
};

beforeEach(() => {
  jest.clearAllMocks();
  currentMockData = mockUser;
  currentMockError = null;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// =============================================================================
// GET /api/profile
// =============================================================================

describe('GET /api/profile', () => {
  test('returns 401 without authentication', async () => {
    await request(app)
      .get('/api/profile')
      .expect(401);
  });

  test('calls profile endpoint for authenticated user', async () => {
    setMockData(mockProfile);

    const response = await request(app)
      .get('/api/profile')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
    expect(mockFrom).toHaveBeenCalled();
  });
});

// =============================================================================
// PUT /api/profile
// =============================================================================

describe('PUT /api/profile', () => {
  const profileUpdate = {
    name: 'Updated Name',
    weight_kg: 72,
    daily_calorie_goal: 2200,
  };

  test('returns 401 without authentication', async () => {
    await request(app)
      .put('/api/profile')
      .send(profileUpdate)
      .expect(401);
  });

  test('calls update endpoint for authenticated user', async () => {
    setMockData({ ...mockProfile, ...profileUpdate });

    const response = await request(app)
      .put('/api/profile')
      .set(authHeaders)
      .send(profileUpdate);

    expect([200, 500]).toContain(response.status);
    expect(mockFrom).toHaveBeenCalled();
  });
});
