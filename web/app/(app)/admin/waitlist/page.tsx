import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, EyeOff, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { ownerSession } from "@/auth";
import { isDemo } from "@/lib/env";
import { allEntries, waitlistStats } from "@/lib/waitlist";
import { WOULD_PAY } from "@/lib/waitlist-options";
import { PayChart, SignupsChart } from "./charts";
import { CopyLanding, WaitlistTable } from "./table";

export const metadata: Metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("en-IN");

function Top({ items, empty }: { items: { label: string; n: number }[]; empty: string }) {
  if (!items.length) return <p className="mt-1 text-sm text-fg-subtle">{empty}</p>;
  const max = Math.max(...items.map((i) => i.n));
  return (
    <ul className="mt-2 space-y-1.5">
      {items.slice(0, 3).map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,1fr)_56px_24px] items-center gap-2 text-[12.5px]">
          <span className="truncate text-fg" title={i.label}>{i.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-accent/80" style={{ width: `${(i.n / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono text-[11px] text-fg-subtle tabular-nums">{i.n}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function WaitlistAdmin() {
  if (isDemo()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <PageHeader title="Waitlist" description="Signups from the public landing page." />
        <div className="mt-6">
          <EmptyState icon={EyeOff} title="Hidden in the demo" description="Waitlist signups are personal data, so the public demo never shows them." />
        </div>
      </div>
    );
  }
  if (!(await ownerSession())) notFound();
  const [stats, rows] = await Promise.all([waitlistStats(), allEntries()]);
  const pay = WOULD_PAY.map((label) => ({ label, n: stats.pay.find((p) => p.label === label)?.n ?? 0 }));
  const tiles = [
    { label: "Total signups", value: n(stats.total), sub: stats.total ? `${n(rows.filter((r) => r.referredBy).length)} via referral` : "none yet" },
    { label: "Last 7 days", value: n(stats.last7), sub: stats.total ? `${Math.round((stats.last7 / stats.total) * 100)}% of all` : "—" },
    {
      label: "Would pay ≥ ₹299",
      value: stats.payingShare == null ? "—" : `${Math.round(stats.payingShare * 100)}%`,
      sub: stats.answeredPay ? `of ${n(stats.answeredPay)} who answered` : "nobody answered yet",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Waitlist"
        description="Signups from the public landing page. Positions rank by join time, a day earlier per referral."
        actions={
          stats.total > 0 ? (
            <a href="/admin/waitlist/export" download className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg shadow-card transition-colors hover:bg-muted">
              <Download className="size-4 text-fg-subtle" aria-hidden />
              Export CSV
            </a>
          ) : null
        }
      />

      {stats.total === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Megaphone}
            glow
            title="No one on the waitlist yet"
            description={
              <>
                The form lives on your landing page for signed-out visitors. Share the link where job seekers hang out — a LinkedIn post, a WhatsApp group, a Discord. Every signup gets a referral link, so the first few bring the next.
              </>
            }
            action={<CopyLanding />}
          />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="wl-tiles">
            {tiles.map((t) => (
              <Card key={t.label} className="px-4 py-3">
                <p className="text-xs text-fg-muted">{t.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{t.value}</p>
                <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{t.sub}</p>
              </Card>
            ))}
            <Card className="px-4 py-3">
              <p className="text-xs text-fg-muted">Top roles</p>
              <Top items={stats.roles} empty="Not answered yet" />
            </Card>
            <Card className="px-4 py-3">
              <p className="text-xs text-fg-muted">Top cities</p>
              <Top items={stats.cities} empty="Not answered yet" />
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <Card>
              <CardHeader title="Signups per day" description="Last 30 days, IST" />
              <div className="h-60 p-3">
                <SignupsChart data={stats.daily} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Would you pay for this?" description={stats.answeredPay ? `${n(stats.answeredPay)} answered` : "Nobody answered yet"} />
              <div className="h-60 p-3">
                <PayChart data={pay} />
              </div>
            </Card>
          </div>

          <div className="mt-4">
            <WaitlistTable rows={rows} />
          </div>
        </>
      )}
    </div>
  );
}
