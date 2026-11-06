const RESERVED = new Set(['page', 'limit', 'sort', 'q', 'trash', 'all', 'format', 'start', 'end']);

export function parseFilters(query) {
  const filters = {};
  for (const [key, value] of Object.entries(query)) {
    if (RESERVED.has(key) || value === '' || value === undefined) continue;
    filters[key] = value;
  }
  return filters;
}

function getValue(row, field) {
  return field.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), row);
}

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function matchFilter(row, expression, expected) {
  const [field, operator = 'eq'] = expression.split('__');
  const actual = getValue(row, field);

  if (operator === 'in') {
    const list = String(expected).split(',').filter(Boolean);
    return list.includes(String(actual));
  }
  if (operator === 'neq') return String(actual) !== String(expected);
  if (operator === 'contains') return String(actual ?? '').toLowerCase().includes(String(expected).toLowerCase());
  if (operator === 'gte') return compare(actual, expected) >= 0;
  if (operator === 'lte') return compare(actual, expected) <= 0;
  if (operator === 'gt') return compare(actual, expected) > 0;
  if (operator === 'lt') return compare(actual, expected) < 0;
  if (operator === 'null') return expected === 'true' ? actual == null : actual != null;
  if (actual == null) return false;
  return String(actual) === String(expected);
}

export function searchRows(rows, query, fields) {
  if (!query) return rows;
  const needle = String(query).toLowerCase().trim();
  if (!needle) return rows;
  return rows.filter((row) =>
    fields.some((field) => String(getValue(row, field) ?? '').toLowerCase().includes(needle)),
  );
}

export function filterRows(rows, filters) {
  return rows.filter((row) =>
    Object.entries(filters).every(([expression, value]) => matchFilter(row, expression, value)),
  );
}

export function sortRows(rows, sort) {
  if (!sort) return rows;
  const descending = String(sort).startsWith('-');
  const field = descending ? String(sort).slice(1) : String(sort);
  return [...rows].sort((a, b) => (descending ? -1 : 1) * compare(getValue(a, field), getValue(b, field)));
}

export function paginate(rows, query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(query.limit) || 10));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  return {
    rows: rows.slice(start, start + limit),
    pagination: { page: safePage, limit, total, totalPages, hasNext: safePage < totalPages, hasPrev: safePage > 1 },
  };
}

export function queryRows(rows, query, searchFields = []) {
  let result = rows;
  result = searchRows(result, query.q, searchFields);
  result = filterRows(result, parseFilters(query));
  result = sortRows(result, query.sort);
  if (String(query.all) === 'true') return { rows: result, pagination: null };
  return paginate(result, query);
}

export function toCsv(rows, columns) {
  if (!rows.length) return '';
  const headers = columns || Object.keys(rows[0]);
  const escape = (value) => {
    if (value == null) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n');
}
