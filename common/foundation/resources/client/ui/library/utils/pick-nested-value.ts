/**
 * Resolve a dotted path through own properties only.
 *
 * Supports array indexes and escaped dots in property names, without loading
 * a glob parser. This is read-only and never creates or mutates properties.
 */
export function pickNestedValue<T = unknown>(
  path: string,
  source: unknown,
): T | undefined {
  if (!path) return undefined;

  const segments = path
    .split(/(?<!\\)\./)
    .map(segment => segment.replace(/\\\./g, '.'));

  let current: unknown = source;

  for (const segment of segments) {
    // Never traverse prototype paths, even for user-controlled menu settings.
    if (
      !segment ||
      segment === '__proto__' ||
      segment === 'constructor' ||
      segment === 'prototype' ||
      current === null ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current as T;
}
