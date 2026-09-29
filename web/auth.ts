import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { allowedLogins } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  callbacks: {
    signIn({ profile }) {
      const login = String((profile as { login?: string } | undefined)?.login ?? "").toLowerCase();
      return login !== "" && allowedLogins().includes(login);
    },
    jwt({ token, profile }) {
      if (profile) token.login = (profile as { login?: string }).login;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { login?: string }).login = token.login as string | undefined;
      return session;
    },
  },
});
