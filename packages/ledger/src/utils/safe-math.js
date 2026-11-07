import { randomUUID } from 'node:crypto';

/**
 * Validates and converts a PostgreSQL BIGINT value (returned as string or number)
 * into a safe JavaScript integer.
 * Throws RangeError if value exceeds Number.MAX_SAFE_INTEGER or is negative.
 * 
 * @param {string | number | bigint} val
 * @returns {number}
 */
export function toSafeInteger(val) {
  if (val === null || val === undefined) {
    throw new TypeError(`Cannot convert null or undefined to safe integer`);
  }

  const num = typeof val === 'bigint' ? Number(val) : Number(String(val).trim());

  if (!Number.isSafeInteger(num)) {
    throw new RangeError(`Value ${val} exceeds JavaScript safe integer range [-${Number.MAX_SAFE_INTEGER}, ${Number.MAX_SAFE_INTEGER}]`);
  }

  return num;
}

/**
 * Generates a standard UUID v4 string.
 * @returns {string}
 */
export function generateUuid() {
  return randomUUID();
}
