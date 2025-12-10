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
