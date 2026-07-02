/**
 * Unit Tests for getOrLinkUserByAuthId
 *
 * This is the identity-resolution core of auth: given a verified Supabase
 * Auth UID + email, it must (in order):
 *   1. return the user matched by auth_user_id
 *   2. else link a pre-existing row by email (sets auth_user_id)
 *   3. else create a new user + default profile
 *
 * Supabase is mocked with a result queue: each terminal call
 * (maybeSingle/single/await) consumes the next queued {data, error}.
 */

import { jest } from '@jest/globals';

// Queue of results, consumed in the order queries resolve
let resultQueue = [];
const nextResult = () =>
  resultQueue.length > 0 ? resultQueue.shift() : { data: null, error: null };

const makeChain = () => {
  const chain = {
    select: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve(nextResult())),
    single: jest.fn(() => Promise.resolve(nextResult())),
    // Chains awaited without a terminal method (e.g. .limit(1), bare insert)
    then: (resolve) => resolve(nextResult()),
  };
  return chain;
};

const chains = [];
const mockFrom = jest.fn((table) => {
  const chain = makeChain();
  chains.push({ table, chain });
  return chain;
});

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

const { getOrLinkUserByAuthId } = await import('../../src/utils/supabase.js');

const AUTH_UID = 'auth-uuid-123';
const EMAIL = 'test@example.com';

beforeEach(() => {
  jest.clearAllMocks();
  resultQueue = [];
  chains.length = 0;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getOrLinkUserByAuthId', () => {

  test('returns user matched by auth_user_id', async () => {
    const user = { id: 'uuid-1', auth_user_id: AUTH_UID, email: EMAIL };
    resultQueue = [{ data: user, error: null }];

    const result = await getOrLinkUserByAuthId(AUTH_UID, EMAIL);

    expect(result).toEqual(user);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  test('links a pre-existing row by email when no auth_user_id match', async () => {
    const legacyUser = { id: 'uuid-legacy', auth_user_id: null, email: EMAIL };
    const linkedUser = { ...legacyUser, auth_user_id: AUTH_UID };
    resultQueue = [
      { data: null, error: null },         // auth_user_id lookup: miss
      { data: [legacyUser], error: null }, // email lookup: hit
      { data: linkedUser, error: null },   // update: linked row
    ];

    const result = await getOrLinkUserByAuthId(AUTH_UID, EMAIL);

    expect(result).toEqual(linkedUser);
    const updateChain = chains[2].chain;
    expect(updateChain.update).toHaveBeenCalledWith({ auth_user_id: AUTH_UID });
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'uuid-legacy');
  });

  test('creates user and default profile when no matches', async () => {
    const created = { id: 'uuid-new', auth_user_id: AUTH_UID, email: EMAIL };
    resultQueue = [
      { data: null, error: null },    // auth_user_id lookup: miss
      { data: [], error: null },      // email lookup: miss
      { data: created, error: null }, // insert user
      { data: null, error: null },    // insert default profile
    ];

    const result = await getOrLinkUserByAuthId(AUTH_UID, EMAIL);

    expect(result).toEqual(created);
    const userInsertChain = chains[2];
    expect(userInsertChain.table).toBe('users');
    expect(userInsertChain.chain.insert).toHaveBeenCalledWith({
      auth_user_id: AUTH_UID,
      email: EMAIL,
    });
    const profileChain = chains[3];
    expect(profileChain.table).toBe('user_profiles');
    expect(profileChain.chain.insert).toHaveBeenCalledWith({ user_id: 'uuid-new' });
  });

  test('skips email linking when email is missing', async () => {
    const created = { id: 'uuid-new', auth_user_id: AUTH_UID, email: null };
    resultQueue = [
      { data: null, error: null },    // auth_user_id lookup: miss
      { data: created, error: null }, // insert user (no email lookup)
      { data: null, error: null },    // insert default profile
    ];

    const result = await getOrLinkUserByAuthId(AUTH_UID, undefined);

    expect(result).toEqual(created);
    // Only 3 queries: lookup, insert user, insert profile
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  test('recovers from insert race (23505) by refetching', async () => {
    const existing = { id: 'uuid-race', auth_user_id: AUTH_UID, email: EMAIL };
    resultQueue = [
      { data: null, error: null },              // auth_user_id lookup: miss
      { data: [], error: null },                // email lookup: miss
      { data: null, error: { code: '23505' } }, // insert: duplicate key
      { data: existing, error: null },          // refetch by auth_user_id
    ];

    const result = await getOrLinkUserByAuthId(AUTH_UID, EMAIL);

    expect(result).toEqual(existing);
  });

  test('returns null on lookup error', async () => {
    resultQueue = [
      { data: null, error: { message: 'connection failed' } },
    ];

    const result = await getOrLinkUserByAuthId(AUTH_UID, EMAIL);

    expect(result).toBeNull();
  });

  test('throws on non-duplicate insert error', async () => {
    resultQueue = [
      { data: null, error: null },
      { data: [], error: null },
      { data: null, error: { code: '42501', message: 'permission denied' } },
    ];

    await expect(getOrLinkUserByAuthId(AUTH_UID, EMAIL)).rejects.toThrow('Failed to create user');
  });
});
