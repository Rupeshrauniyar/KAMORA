const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export interface CookieOptionsLike {
  domain?: string;
  expires?: number | Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
}

/**
 * Ensures Supabase auth cookies persist reliably across browser reloads & restarts
 * (30-day Max-Age, Path=/, SameSite=Lax) while never breaking on http://localhost
 * and properly deleting cookies when Supabase clears them (value === '' or maxAge <= 0).
 */
export function normalizeAuthCookieOptions(
  options: CookieOptionsLike | undefined,
  isHttps: boolean,
  value?: string
): CookieOptionsLike {
  const expiresMs =
    options?.expires instanceof Date
      ? options.expires.getTime()
      : typeof options?.expires === 'number'
      ? options.expires
      : null;

  const isDeleting =
    value === '' ||
    (options?.maxAge !== undefined && options.maxAge <= 0) ||
    (expiresMs !== null && expiresMs <= Date.now());

  return {
    ...options,
    path: '/',
    sameSite: options?.sameSite ?? 'lax',
    secure: isHttps,
    maxAge: isDeleting ? 0 : Math.max(options?.maxAge ?? 0, THIRTY_DAYS_SECONDS),
  };
}
