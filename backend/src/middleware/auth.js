import { supabase, getOrLinkUserByAuthId } from '../utils/supabase.js';

// Verifies the Supabase Auth access token from the Authorization header,
// then resolves (or creates/links) the app user row for it.
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
    }

    const user = await getOrLinkUserByAuthId(data.user.id, data.user.email);

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
