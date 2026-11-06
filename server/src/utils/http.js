export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = true;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function ok(res, data, extra = {}) {
  return res.json({ success: true, data, ...extra });
}

export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res) {
  return res.status(204).end();
}
