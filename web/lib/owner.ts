import { allowedLogins } from "./env";

type MaybeSession = { user?: { email?: string | null; login?: string; provider?: string } | null } | null | undefined;

export function isOwner(session: MaybeSession) {
  const u = session?.user as { email?: string | null; login?: string; provider?: string } | undefined;
  if (!u) return false;
  if (u.provider === "credentials") {
    const owner = String(process.env.SCOUT_OWNER_EMAIL ?? "").trim().toLowerCase();
    return owner !== "" && String(u.email ?? "").trim().toLowerCase() === owner;
  }
  if (u.provider === "github") {
    const login = String(u.login ?? "").toLowerCase();
    return login !== "" && allowedLogins().includes(login);
  }
  return false;
}
