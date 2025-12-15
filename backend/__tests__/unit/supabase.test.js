/**
 * MOCKING SUPABASE - A Comprehensive Example
 *
 * This file demonstrates how to mock external dependencies (Supabase)
 * so you can test your code without hitting a real database.
 */

import { jest } from '@jest/globals';

// =============================================================================
// STEP 1: MOCK THE MODULE
// =============================================================================
//
// We need to mock '@supabase/supabase-js' BEFORE importing our code.
// jest.unstable_mockModule is used for ES modules (your project uses "type": "module")
//
// The mock replaces the real Supabase client with a fake one we control.

// Create mock functions we can configure per-test
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();

// Build a chainable mock that mimics Supabase's fluent API:
// supabase.from('users').select('*').eq('id', 1).single()
const mockFrom = jest.fn(() => ({
  select: mockSelect.mockReturnValue({
    eq: mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    }),
  }),
  insert: mockInsert.mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: mockSingle,
    }),
  }),
}));

// Mock the entire @supabase/supabase-js module
jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// =============================================================================
// STEP 2: IMPORT YOUR CODE AFTER MOCKING
// =============================================================================
//
// IMPORTANT: Dynamic import MUST happen after jest.unstable_mockModule
// This ensures your code gets the mocked version, not the real Supabase

const { getUserByClerkId, createOrGetUser } = await import('../../src/utils/supabase.js');

// =============================================================================
// STEP 3: RESET MOCKS BETWEEN TESTS
// =============================================================================
//
// Each test should start with a clean slate. beforeEach runs before every test.

beforeEach(() => {
  // Clear all mock call history and reset return values
  jest.clearAllMocks();
});

// =============================================================================
// TESTS FOR getUserByClerkId
// =============================================================================

describe('getUserByClerkId', () => {

  // -------------------------------------------------------------------------
  // TEST 1: Happy path - user exists
  // -------------------------------------------------------------------------
  test('returns user when found', async () => {
    // ARRANGE: Configure the mock to return a user
    const mockUser = {
      id: 'uuid-123',
      clerk_user_id: 'clerk_abc',
      email: 'test@example.com',
    };

    // Tell the mock what to return when called
    mockMaybeSingle.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    // ACT: Call the function
    const result = await getUserByClerkId('clerk_abc');

    // ASSERT: Verify the result
    expect(result).toEqual(mockUser);

    // VERIFY: Check that Supabase was called correctly
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('clerk_user_id', 'clerk_abc');
  });

  // -------------------------------------------------------------------------
  // TEST 2: User not found
  // -------------------------------------------------------------------------
  test('returns null when user not found', async () => {
    // ARRANGE: maybeSingle returns null data when no rows match
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    // ACT
    const result = await getUserByClerkId('nonexistent_clerk_id');

    // ASSERT
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // TEST 3: Database error
  // -------------------------------------------------------------------------
  test('returns null and logs error on database failure', async () => {
    // ARRANGE: Simulate a database error
    const dbError = { message: 'Connection failed', code: 'PGRST000' };
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: dbError,
    });

    // Spy on console.error to verify error logging
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // ACT
    const result = await getUserByClerkId('clerk_abc');

    // ASSERT
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching user:', dbError);

    // Cleanup: restore console.error
    consoleSpy.mockRestore();
  });
});

// =============================================================================
// TESTS FOR createOrGetUser
// =============================================================================

describe('createOrGetUser', () => {

  // -------------------------------------------------------------------------
  // TEST 1: User already exists - should return existing user
  // -------------------------------------------------------------------------
  test('returns existing user without creating new one', async () => {
    // ARRANGE: User already exists
    const existingUser = {
      id: 'uuid-123',
      clerk_user_id: 'clerk_abc',
      email: 'existing@example.com',
    };

    mockMaybeSingle.mockResolvedValue({
      data: existingUser,
      error: null,
    });

    // ACT
    const result = await createOrGetUser('clerk_abc', 'existing@example.com');

    // ASSERT
    expect(result).toEqual(existingUser);

    // Verify insert was NOT called (we returned early)
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TEST 2: New user - should create user and profile
  // -------------------------------------------------------------------------
  test('creates new user when not found', async () => {
    // ARRANGE
    const newUser = {
      id: 'uuid-456',
      clerk_user_id: 'clerk_new',
      email: 'new@example.com',
    };

    // First call to getUserByClerkId returns null (user doesn't exist)
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Insert returns the new user
    mockSingle.mockResolvedValueOnce({
      data: newUser,
      error: null,
    });

    // ACT
    const result = await createOrGetUser('clerk_new', 'new@example.com');

    // ASSERT
    expect(result).toEqual(newUser);

    // Verify insert was called with correct data
    expect(mockInsert).toHaveBeenCalledWith({
      clerk_user_id: 'clerk_new',
      email: 'new@example.com',
    });
  });

  // -------------------------------------------------------------------------
  // TEST 3: Race condition - duplicate key error (23505)
  // -------------------------------------------------------------------------
  test('handles race condition by fetching existing user', async () => {
    // ARRANGE: Simulate a race condition
    // Two requests try to create the same user simultaneously
    const existingUser = {
      id: 'uuid-123',
      clerk_user_id: 'clerk_race',
      email: 'race@example.com',
    };

    // First call: user doesn't exist
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      // Second call (after duplicate error): user now exists
      .mockResolvedValueOnce({ data: existingUser, error: null });

    // Insert fails with duplicate key error
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    });

    // ACT
    const result = await createOrGetUser('clerk_race', 'race@example.com');

    // ASSERT: Should recover and return the existing user
    expect(result).toEqual(existingUser);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Non-recoverable database error
  // -------------------------------------------------------------------------
  test('throws error on non-duplicate database failure', async () => {
    // ARRANGE
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST000', message: 'Connection failed' },
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // ACT & ASSERT: Expect the function to throw
    await expect(createOrGetUser('clerk_fail', 'fail@example.com'))
      .rejects
      .toThrow('Failed to create user');

    consoleSpy.mockRestore();
  });
});
