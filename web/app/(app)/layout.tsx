import { AppShell } from "@/components/app-shell";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { auth } from "@/auth";
import { isDemo } from "@/lib/env";
import { getNavCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [counts, session] = await Promise.all([getNavCounts(), isDemo() ? null : auth()]);
  const user = (session?.user as { login?: string; name?: string } | undefined)?.login ?? session?.user?.name ?? null;
  return (
    <AppShell counts={counts} user={user}>
      {children}
      <CommandPalette />
      <ShortcutsHelp />
    </AppShell>
  );
}
