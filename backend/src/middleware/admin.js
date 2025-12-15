import jwt from 'jsonwebtoken';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-admin-secret-change-this';

/**
 * Middleware to verify admin JWT token
 * Attaches decoded admin info to req.admin
 */
export function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Generate admin JWT token
 * @param {string} email - Admin email
 * @param {Object} options - Additional options
 * @returns {string} JWT token
 */
export function generateAdminToken(email, options = {}) {
  return jwt.sign(
    { email, isAdmin: true, ...options },
    ADMIN_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verify admin token and return decoded payload
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 */
export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

export { ADMIN_SECRET };
