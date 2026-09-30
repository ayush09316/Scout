import NextAuth, { CredentialsSignin } from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { allowedLogins, githubConfigured, ownerConfigured } from "@/lib/env";
import { safeEqualText, verifyPassword } from "@/lib/password";
import { clearFailures, isLimited, recordFailure } from "@/lib/rate-limit";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

function clientIp(req: Request | undefined) {
  const h = req?.headers;
  return h?.get("x-forwarded-for")?.split(",")[0]?.trim() || h?.get("x-real-ip") || "local";
}

const providers: Provider[] = [];
if (githubConfigured()) providers.push(GitHub);
if (ownerConfigured())
  providers.push(
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      authorize(creds, req) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        const key = `${clientIp(req)}|${email}`;
        if (isLimited(key)) throw new RateLimited();
        const owner = String(process.env.SCOUT_OWNER_EMAIL).trim().toLowerCase();
        const emailOk = safeEqualText(email, owner);
        const pwOk = verifyPassword(password, String(process.env.SCOUT_OWNER_PASSWORD_HASH));
        if (!emailOk || !pwOk) {
          recordFailure(key);
          return null;
        }
        clearFailures(key);
        return { id: "owner", email: owner, name: owner };
      },
    }),
  );

export const configuredProviders = () => ({ github: githubConfigured(), credentials: ownerConfigured() });

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "credentials") return true;
      const login = String((profile as { login?: string } | undefined)?.login ?? "").toLowerCase();
      return login !== "" && allowedLogins().includes(login);
    },
    jwt({ token, profile, account }) {
      if (profile) token.login = (profile as { login?: string }).login;
      if (account) token.provider = account.provider;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as { login?: string; provider?: string };
        u.login = token.login as string | undefined;
        u.provider = token.provider as string | undefined;
      }
      return session;
    },
  },
});
