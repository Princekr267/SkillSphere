/**
 * Returns the JWT secret used for signing/verifying tokens.
 *
 * - In production (NODE_ENV === 'production'): throws a fatal Error if
 *   JWT_SECRET is not set, preventing the app from running with a forgeable key.
 * - In all other environments: falls back to an obviously-insecure dev string
 *   and emits a console warning so developers notice immediately.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is not set. Refusing to start in production.');
  }

  console.warn(
    '⚠️  JWT_SECRET not set — using insecure dev fallback. DO NOT deploy like this.'
  );
  return 'dev_only_insecure_fallback_do_not_use_in_prod';
}
