const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub || req.ip // Prefer user.sub, fallback to IP
});

// Add a stricter limiter for health checks
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Only 10 requests per minute per IP
  message: 'Too many health check requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { apiLimiter, healthLimiter };
