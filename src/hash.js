function hashString(s) {
  let hash = 0,
    i,
    chr;
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Generates a hash from the given value.
 *
 * @param {string | *} input An input value to hash
 * @returns {number} The generated hash
 * @public
 */
export function hash(input) {
  return hashString(typeof input === "string" ? input : JSON.stringify(input));
}
