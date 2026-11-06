import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getById } from '../db/store.js';
import { ApiError } from '../utils/http.js';

export function signToken(profile) {
  return jwt.sign({ sub: profile.id }, config.jwtSecret, { expiresIn: config.jwtExpires });
}

export function authRequired(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required.'));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const profile = getById('profiles', payload.sub);
    if (!profile) return next(new ApiError(401, 'Session is no longer valid.'));
    if (profile.status && profile.status !== 'active') {
      return next(new ApiError(403, 'Your account is not active. Contact your administrator.'));
    }
    req.user = profile;
    return next();
  } catch {
    return next(new ApiError(401, 'Session expired or invalid. Please sign in again.'));
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required.'));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

export function clientScope(req) {
  return req.user?.role === 'client' ? req.user.client_id : null;
}
