import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get user from Supabase by Clerk ID
export async function getUserByClerkId(clerkUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

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

  if (!user) {
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
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }

    user = data;

    // Create default user profile
    await supabase.from('user_profiles').insert({
      user_id: user.id
    });
  }

  return user;
}
