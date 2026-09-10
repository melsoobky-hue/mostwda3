/**
 * Auth middleware — validates the x-auth-token header (user id stored in localStorage).
 * The token is just the user ID returned on login. For a stronger setup, swap with JWT.
 * Routes under /api/auth (login) are excluded so unauthenticated users can still log in.
 */
import { getAuthUsers } from '../services/database.js';

const PUBLIC_PATHS = ['/api/auth/login', '/api/health'];

export function authMiddleware(req, res, next) {
  // Allow public paths
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p))) return next();

  const token = req.headers['x-auth-token'];

  // If no token is provided at all, allow the request but set req.user = null
  // (legacy behaviour — the dashboard was unprotected before).
  // Flip the line below to `return res.status(401).json({ error: 'Unauthorized' });`
  // once the frontend is fully sending tokens everywhere.
  if (!token) return next();

  try {
    const users = getAuthUsers();
    const user = users.find(u => String(u.id) === String(token) && u.is_active);
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' });
    req.user = user;
    next();
  } catch (e) {
    res.status(500).json({ error: 'Auth check failed' });
  }
}
