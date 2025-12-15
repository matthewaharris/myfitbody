/**
 * Test Setup Helpers
 *
 * Common utilities and mocks for integration testing
 */

import { jest } from '@jest/globals';

// =============================================================================
// Mock Data Factories
// =============================================================================

export const mockUser = (overrides = {}) => ({
  id: 'user-uuid-123',
  clerk_user_id: 'clerk_test_user',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockMeal = (overrides = {}) => ({
  id: 'meal-uuid-123',
  user_id: 'user-uuid-123',
  food_name: 'Test Food',
  calories: 250,
  protein: 20,
  carbs: 30,
  fat: 10,
  meal_type: 'lunch',
  logged_at: new Date().toISOString(),
  is_favorite: false,
  ...overrides,
});

export const mockWorkout = (overrides = {}) => ({
  id: 'workout-uuid-123',
  user_id: 'user-uuid-123',
  name: 'Test Workout',
  duration_minutes: 45,
  calories_burned: 300,
  workout_type: 'strength',
  exercises: [],
  logged_at: new Date().toISOString(),
  ...overrides,
});

export const mockProfile = (overrides = {}) => ({
  id: 'profile-uuid-123',
  user_id: 'user-uuid-123',
  height_cm: 175,
  weight_kg: 70,
  goal: 'maintain',
  activity_level: 'moderate',
  daily_calorie_goal: 2000,
  daily_protein_goal: 150,
  ...overrides,
});

// =============================================================================
// Auth Headers Helper
// =============================================================================

export const authHeaders = (clerkUserId = 'clerk_test_user', email = 'test@example.com') => ({
  'x-clerk-user-id': clerkUserId,
  'x-user-email': email,
});

// =============================================================================
// Supabase Mock Builder
// =============================================================================

export function createSupabaseMock() {
  const mockData = {
    selectResult: null,
    insertResult: null,
    updateResult: null,
    deleteResult: null,
    error: null,
  };

  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve({ data: mockData.selectResult, error: mockData.error })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: mockData.selectResult, error: mockData.error })),
  };

  const mockFrom = jest.fn(() => mockChain);

  return {
    from: mockFrom,
    chain: mockChain,
    setData: (data) => { mockData.selectResult = data; },
    setError: (error) => { mockData.error = error; },
    reset: () => {
      mockData.selectResult = null;
      mockData.error = null;
      jest.clearAllMocks();
    },
  };
}
