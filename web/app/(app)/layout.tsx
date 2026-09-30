import { AppShell } from "@/components/app-shell";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { auth } from "@/auth";
import { isDemo } from "@/lib/env";
import { getNavCounts } from "@/lib/queries";
import { getDueReminders } from "@/lib/intel";
import { waitlistCount } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [counts, session, reminders, waitlist] = await Promise.all([getNavCounts(), isDemo() ? null : auth(), getDueReminders(), isDemo() ? 0 : waitlistCount()]);
  const u = session?.user as { login?: string; name?: string | null; email?: string | null } | undefined;
  const user = u?.login ?? u?.email ?? u?.name ?? null;
  return (
    <AppShell counts={{ ...counts, waitlist }} user={user} reminders={reminders}>
      {children}
      <CommandPalette />
      <ShortcutsHelp />
    </AppShell>
  );
}
