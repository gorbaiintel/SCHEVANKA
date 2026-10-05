import type { Request, Response, NextFunction } from 'express';

/**
 * Enterprise-grade Security Headers Middleware
 * Protects the Schevanka Terminal environment with Content Security Policy (CSP),
 * Strict-Transport-Security (HSTS), X-Content-Type-Options, Referrer-Policy,
 * and Permissions-Policy, while maintaining compatibility with AI Studio iFrame
 * preview embeds and Vite development tooling.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. Content-Type Sniffing Protection
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 2. HTTP Strict Transport Security (HSTS) - Enforce HTTPS for 1 year
  // In Cloud Run / production environments (detected via proto or NODE_ENV)
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // 3. Content Security Policy (CSP)
  // Configured to protect against XSS/injection attacks while accommodating
  // AI Studio iframe embedding, Cloud Run proxy scripts, Brave Browser Shields, Partitioned Cookies (CHIPS), WebAssembly, and live WebSockets.
  const cspDirectives = [
    "default-src * 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob:",
    "script-src * 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob:",
    "style-src * 'unsafe-inline' data: blob:",
    "font-src * data: blob:",
    "img-src * data: blob:",
    "media-src * data: blob:",
    "worker-src * data: blob:",
    "connect-src * data: blob: wss: ws:",
    "frame-src * data: blob:",
    "frame-ancestors *",
    "form-action * 'self'",
    "base-uri 'self'",
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // 4. Partitioned Cookies (CHIPS) for Brave Browser & Cross-Origin Iframe Compatibility
  // Ensures cookies are never blocked by Brave Shields or third-party cookie restrictions
  if (!req.headers.cookie || !req.headers.cookie.includes('schevanka_brave_chips=active')) {
    res.append(
      'Set-Cookie',
      'schevanka_brave_chips=active; Path=/; Secure; SameSite=None; Partitioned; Max-Age=2592000'
    );
  }

  // 5. Referrer Policy: Send origin on cross-origin HTTPS
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Permissions Policy: Allow clipboard and fullscreen for WebTerminal while restricting hardware sensors
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), fullscreen=(self "https://*"), clipboard-read=(self "https://*"), clipboard-write=(self "https://*")');

  // 6. X-XSS-Protection legacy defense
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
}

export default securityHeadersMiddleware;
