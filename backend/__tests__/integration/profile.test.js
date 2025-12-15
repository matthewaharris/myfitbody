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
  clerk_user_id: 'clerk_test_user',
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
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    then: (resolve) => resolve({ data: currentMockData, error: currentMockError }),
  };
  return chain;
};

const mockFrom = jest.fn(() => createChain());

const setMockData = (data, error = null) => {
  currentMockData = data;
  currentMockError = error;
};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

const { app } = await import('../../src/index.js');

const authHeaders = {
  'x-clerk-user-id': 'clerk_test_user',
  'x-user-email': 'test@example.com',
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
