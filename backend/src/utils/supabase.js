import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required)');
}

// Use service role key for backend - bypasses RLS
// This is safe because backend already handles auth via Clerk middleware
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to get user from Supabase by Clerk ID
export async function getUserByClerkId(clerkUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no rows, no error

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

// Resolve the app user for a verified Supabase Auth UID.
// Order: match auth_user_id -> link existing row by email -> create new user.
// Linking by email lets pre-migration (Clerk-era) accounts keep all their data.
export async function getOrLinkUserByAuthId(authUserId, email) {
  const { data: existing, error: lookupError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (lookupError) {
    console.error('Error fetching user by auth id:', lookupError);
    return null;
  }

  if (existing) {
    return existing;
  }

  if (email) {
    const { data: emailMatches, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .is('auth_user_id', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (emailError) {
      console.error('Error fetching user by email:', emailError);
    } else if (emailMatches && emailMatches.length > 0) {
      const { data: linked, error: linkError } = await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('id', emailMatches[0].id)
        .select()
        .single();

      if (linkError) {
        console.error('Error linking user by email:', linkError);
      } else {
        return linked;
      }
    }
  }

  const { data: created, error: createError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUserId,
      email: email
    })
    .select()
    .single();

  if (createError) {
    // Handle race condition - if duplicate key error, fetch the existing user
    if (createError.code === '23505') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      return data;
    }
    console.error('Error creating user:', createError);
    throw new Error('Failed to create user');
  }

  // Create default user profile
  await supabase.from('user_profiles').insert({
    user_id: created.id
  });

  return created;
}

// Helper function to create or get user
export async function createOrGetUser(clerkUserId, email) {
  // Try to get existing user
  let user = await getUserByClerkId(clerkUserId);

  if (user) {
    return user;
  }

  // Create new user
  const { data, error } = await supabase
    .from('users')
    .insert({
      clerk_user_id: clerkUserId,
      email: email
    })
    .select()
    .single();

  if (error) {
    // Handle race condition - if duplicate key error, fetch the existing user
    if (error.code === '23505') {
      console.log('User already exists, fetching existing user');
      return await getUserByClerkId(clerkUserId);
    }
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }

  user = data;

  // Create default user profile
  await supabase.from('user_profiles').insert({
    user_id: user.id
  });

  return user;
}
