const jwt = require('jsonwebtoken');
const { UserRepository, SessionRepository } = require('../repositories');

const JWT_SECRET = process.env.JWT_SECRET || 'plan4growth-secret-key-2024';

const authMiddleware = async (req, res, next) => {
  try {
    // Check for session_token cookie first (Google OAuth)
    const sessionToken = req.cookies.session_token;
    if (sessionToken) {
      const session = await SessionRepository.findByToken(sessionToken);
      if (session && session.expires_at > new Date()) {
        const user = await UserRepository.findByUserId(session.user_id);
        if (user) {
          req.user = user;
          return next();
        }
      }
    }

    // Check for Authorization header (JWT)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await UserRepository.findByUserId(decoded.user_id);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ detail: 'Token expired' });
        }
        return res.status(401).json({ detail: 'Invalid token' });
      }
    }

    // Check for token in query parameter (for file downloads opened in new tab)
    const queryToken = req.query.token;
    if (queryToken) {
      try {
        const decoded = jwt.verify(queryToken, JWT_SECRET);
        const user = await UserRepository.findByUserId(decoded.user_id);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (jwtError) {
        return res.status(401).json({ detail: 'Invalid token' });
      }
    }

    return res.status(401).json({ detail: 'Not authenticated' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ detail: 'Authentication error' });
  }
};

module.exports = authMiddleware;
