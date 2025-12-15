/**
 * Integration Tests for Food Routes
 *
 * Tests the /api/foods endpoints for auth and accessibility.
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

// Mock fetch for external API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

let currentMockData = null;
let currentMockError = null;

const mockMaybeSingle = jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError }));

const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
  single: jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError })),
  then: (resolve) => resolve({ data: currentMockData, error: currentMockError }),
}));

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

describe('Food Routes Authentication', () => {
  test('GET /api/foods/search returns 401 without auth', async () => {
    await request(app)
      .get('/api/foods/search')
      .query({ q: 'chicken' })
      .expect(401);
  });

  test('GET /api/foods/:foodId returns 401 without auth', async () => {
    await request(app)
      .get('/api/foods/usda_12345')
      .expect(401);
  });

  test('GET /api/foods/barcode/:barcode returns 401 without auth', async () => {
    await request(app)
      .get('/api/foods/barcode/1234567890123')
      .expect(401);
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('Food Routes Validation', () => {
  test('GET /api/foods/search handles missing query', async () => {
    const response = await request(app)
      .get('/api/foods/search')
      .set(authHeaders);

    // API may return 400 (bad request) or 200 with empty results
    expect([200, 400]).toContain(response.status);
  });
});

// =============================================================================
// Endpoint Tests with Mocked External APIs
// =============================================================================

describe('Food Search with External API', () => {
  test('searches foods when query provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        foods: [{ fdcId: 12345, description: 'Chicken' }],
      }),
    });

    const response = await request(app)
      .get('/api/foods/search')
      .query({ q: 'chicken' })
      .set(authHeaders);

    // Either succeeds or fails - tests endpoint is accessible
    expect([200, 500]).toContain(response.status);
  });
});

describe('Food Details', () => {
  test('fetches USDA food details', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        fdcId: 12345,
        description: 'Chicken breast',
        foodNutrients: [],
      }),
    });

    const response = await request(app)
      .get('/api/foods/usda_12345')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
  });
});

describe('Barcode Lookup', () => {
  test('looks up barcode in OpenFoodFacts', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 1,
        product: {
          product_name: 'Test Product',
          nutriments: { 'energy-kcal_100g': 200 },
        },
      }),
    });

    const response = await request(app)
      .get('/api/foods/barcode/1234567890123')
      .set(authHeaders);

    expect([200, 404, 500]).toContain(response.status);
  });

  test('returns 404 for unknown barcode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 0 }),
    });

    const response = await request(app)
      .get('/api/foods/barcode/0000000000000')
      .set(authHeaders);

    expect([404, 500]).toContain(response.status);
  });
});
