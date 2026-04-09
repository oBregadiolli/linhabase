/**
 * Sanitize a redirectTo value to prevent open redirect attacks.
 *
 * Rules:
 *   1. Must start with '/' (relative path)
 *   2. Must NOT start with '//' (protocol-relative URL)
 *   3. Must NOT contain '://' (absolute URL)
 *   4. Must NOT contain backslash (path traversal on Windows)
 *   5. Must NOT contain null bytes
 *   6. Fallback to defaultPath if invalid
 *
 * @param redirectTo - The raw redirectTo value from query params
 * @param defaultPath - Fallback path (defaults to '/dashboard')
 * @returns Sanitized path safe for internal redirect
 */
export function sanitizeRedirectTo(
  redirectTo: string | null | undefined,
  defaultPath = '/dashboard'
): string {
  if (!redirectTo || typeof redirectTo !== 'string') {
    return defaultPath
  }

  const trimmed = redirectTo.trim()

  // Must start with exactly one forward slash
  if (!trimmed.startsWith('/')) return defaultPath

  // Block protocol-relative URLs
  if (trimmed.startsWith('//')) return defaultPath

  // Block absolute URLs embedded anywhere
  if (trimmed.includes('://')) return defaultPath

  // Block backslashes (Windows path traversal / some browsers normalize)
  if (trimmed.includes('\\')) return defaultPath

  // Block null bytes
  if (trimmed.includes('\0')) return defaultPath

  // Block data: URLs encoded in path
  if (trimmed.toLowerCase().includes('data:')) return defaultPath

  return trimmed
}
