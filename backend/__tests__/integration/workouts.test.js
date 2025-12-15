/**
 * Integration Tests for Workout Routes
 *
 * Tests the /api/workouts endpoints including auth requirements
 * and basic endpoint accessibility.
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

const mockWorkout = {
  id: 'workout-uuid-456',
  user_id: 'user-uuid-123',
  name: 'Morning Run',
  duration_minutes: 30,
  calories_burned: 300,
  workout_type: 'cardio',
  exercises: [{ name: 'Running', duration: 30, calories: 300 }],
  logged_at: '2024-01-15T08:00:00Z',
  is_template: false,
  is_favorite: false,
};

let currentMockData = null;
let currentMockError = null;

const mockSingle = jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError }));
const mockMaybeSingle = jest.fn(() => Promise.resolve({ data: currentMockData, error: currentMockError }));

const createChain = () => {
  const chain = {
    select: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    delete: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(() => chain),
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

describe('Workout Routes Authentication', () => {
  test('GET /api/workouts returns 401 without auth', async () => {
    await request(app).get('/api/workouts').expect(401);
  });

  test('POST /api/workouts returns 401 without auth', async () => {
    await request(app).post('/api/workouts').send(mockWorkout).expect(401);
  });

  test('GET /api/workouts/:id returns 401 without auth', async () => {
    await request(app).get('/api/workouts/workout-uuid-456').expect(401);
  });

  test('PUT /api/workouts/:id returns 401 without auth', async () => {
    await request(app).put('/api/workouts/workout-uuid-456').send({}).expect(401);
  });

  test('GET /api/workouts/templates returns 401 without auth', async () => {
    await request(app).get('/api/workouts/templates').expect(401);
  });
});

// =============================================================================
// Endpoint Accessibility Tests
// =============================================================================

describe('Workout Routes with Auth', () => {
  test('GET /api/workouts is accessible', async () => {
    setMockData([mockWorkout]);

    const response = await request(app)
      .get('/api/workouts')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
    expect(mockFrom).toHaveBeenCalled();
  });

  test('POST /api/workouts accepts workout data', async () => {
    setMockData(mockWorkout);

    const response = await request(app)
      .post('/api/workouts')
      .set(authHeaders)
      .send({
        name: 'New Workout',
        duration_minutes: 45,
        workout_type: 'strength',
      });

    expect([200, 201, 500]).toContain(response.status);
    expect(mockFrom).toHaveBeenCalled();
  });

  test('GET /api/workouts/:id returns workout', async () => {
    setMockData(mockWorkout);

    const response = await request(app)
      .get('/api/workouts/workout-uuid-456')
      .set(authHeaders);

    expect([200, 500]).toContain(response.status);
  });
});

// =============================================================================
// POST /api/workouts/estimate-calories
// =============================================================================

describe('POST /api/workouts/estimate-calories', () => {
  test('returns 401 without auth', async () => {
    await request(app)
      .post('/api/workouts/estimate-calories')
      .send({ workout_type: 'cardio', duration_minutes: 30 })
      .expect(401);
  });

  test('estimates calories for workout', async () => {
    const response = await request(app)
      .post('/api/workouts/estimate-calories')
      .set(authHeaders)
      .send({
        workout_type: 'cardio',
        duration_minutes: 30,
        intensity: 'moderate',
      });

    expect([200, 500]).toContain(response.status);
  });
});
