export const isDemo = () => process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

export const allowedLogins = () =>
  (process.env.AUTH_ALLOWED_GITHUB ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const githubConfigured = () => Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

export const ownerConfigured = () => Boolean(process.env.SCOUT_OWNER_EMAIL && process.env.SCOUT_OWNER_PASSWORD_HASH);

export const demoUrl = () => process.env.NEXT_PUBLIC_DEMO_URL || null;
