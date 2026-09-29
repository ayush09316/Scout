"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { stroke: "var(--fg-subtle)", fontSize: 11, tickLine: false, axisLine: false } as const;

function short(w: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w);
  if (!m) return w;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]}`;
}

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-fg">Week of {short(label ?? "")}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-fg-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto pl-3 font-mono text-fg tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function VelocityChart({ data }: { data: { week: string; opened: number; closed: number }[] }) {
  if (!data.length) return <p className="flex h-full items-center justify-center text-sm text-fg-subtle">No history yet</p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="week" {...axis} tickFormatter={short} interval="preserveStartEnd" minTickGap={18} />
        <YAxis {...axis} width={40} allowDecimals={false} />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span style={{ color: "var(--fg-muted)" }}>{v}</span>} />
        <Bar dataKey="opened" name="opened" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={14} />
        <Bar dataKey="closed" name="closed" fill="var(--fg-subtle)" fillOpacity={0.5} radius={[3, 3, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
