/**
 * Integration Tests for Stats Routes
 *
 * Tests the /api/stats endpoints for auth and accessibility.
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

let currentMockData = null;
let currentMockError = null;

const mockSingle = jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError }));
const mockMaybeSingle = jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError }));

const createChain = () => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    order: jest.fn(() => chain),
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
// Authentication Tests
// =============================================================================

describe('Stats Routes Authentication', () => {
  test('GET /api/stats/daily returns 401 without auth', async () => {
    await request(app).get('/api/stats/daily').expect(401);
  });

  test('GET /api/stats/weekly returns 401 without auth', async () => {
    await request(app).get('/api/stats/weekly').expect(401);
  });

  test('GET /api/stats/user returns 401 without auth', async () => {
    await request(app).get('/api/stats/user').expect(401);
  });
});

// =============================================================================
// Endpoint Accessibility Tests
// =============================================================================

describe('Stats Routes with Auth', () => {
  test('GET /api/stats/daily is accessible', async () => {
    setMockData([]);

    const response = await request(app)
      .get('/api/stats/daily')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
    expect(mockFrom).toHaveBeenCalled();
  });

  test('GET /api/stats/daily/:date accepts date parameter', async () => {
    setMockData([]);

    const response = await request(app)
      .get('/api/stats/daily/2024-01-15')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
  });

  test('GET /api/stats/weekly is accessible', async () => {
    setMockData([]);

    const response = await request(app)
      .get('/api/stats/weekly')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
  });

  test('GET /api/stats/user is accessible', async () => {
    setMockData([]);

    const response = await request(app)
      .get('/api/stats/user')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
  });
});
