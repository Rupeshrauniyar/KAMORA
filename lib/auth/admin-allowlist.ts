/**
 * Server-only helper (Edge + Node safe) checking whether a verified Supabase Auth user
 * matches the server-configured ADMIN_EMAILS allowlist.
 * Always called ONLY with user data returned by supabase.auth.getUser() (verified JWT).
 */
export function isAuthorizedAdminEmail(
  email: string | null | undefined,
  emailConfirmedAt?: string | null
): boolean {
  if (!email) return false;
  // Require confirmed email so nobody can register an unverified lookalike account
  if (emailConfirmedAt === null) return false;

  const raw = process.env.ADMIN_EMAILS ?? '';
  if (!raw.trim()) return false;

  const allowlist = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.trim().toLowerCase());
}
