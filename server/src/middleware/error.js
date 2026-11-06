import multer from 'multer';
import { ApiError } from '../utils/http.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} was not found.`));
}

export function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message || 'Something went wrong.';

  if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum size is 10 MB.' : error.message;
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = 'File is too large. Maximum size is 10 MB.';
  }

  if (status >= 500) {
    console.error('[error]', error);
    if (process.env.NODE_ENV === 'production') message = 'An unexpected server error occurred.';
  }

  res.status(status).json({
    success: false,
    message,
    ...(error.details ? { details: error.details } : {}),
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: error.stack } : {}),
  });
}
