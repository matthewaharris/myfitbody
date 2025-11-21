import { getUserByClerkId, createOrGetUser } from '../utils/supabase.js';

// For MVP, we'll use a simple auth check
// In production, you'd verify Clerk JWT tokens
export async function requireAuth(req, res, next) {
  try {
    // For MVP, we'll accept clerk_user_id from headers
    // In production, extract this from verified JWT
    const clerkUserId = req.headers['x-clerk-user-id'];
    const email = req.headers['x-user-email'];

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized - No user ID provided' });
    }

    // Get or create user in our database
    const user = await createOrGetUser(clerkUserId, email);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
