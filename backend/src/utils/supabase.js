import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required)');
}

// Use service role key for backend - bypasses RLS
// This is safe because requireAuth verifies the Supabase JWT on every request
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
