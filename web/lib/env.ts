export const isDemo = () => process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

export const allowedLogins = () =>
  (process.env.AUTH_ALLOWED_GITHUB ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
