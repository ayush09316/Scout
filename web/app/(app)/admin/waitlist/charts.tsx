"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { stroke: "var(--fg-subtle)", fontSize: 11, tickLine: false, axisLine: false } as const;

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });
};

function Tip({ active, payload, label, title, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; title?: (l: string) => string; unit?: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="font-medium text-fg">{title ? title(String(label)) : label}</p>
      <p className="mt-0.5 text-fg-muted">
        <span className="font-mono text-fg tabular-nums">{v.toLocaleString("en-IN")}</span> {unit === "people" ? (v === 1 ? "person" : "people") : v === 1 ? "signup" : "signups"}
      </p>
    </div>
  );
}

export function SignupsChart({ data }: { data: { day: string; n: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" {...axis} tickFormatter={dayLabel} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axis} width={32} allowDecimals={false} domain={[0, (max: number) => Math.max(max, 3)]} />
        <Tooltip content={<Tip title={dayLabel} />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="n" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CountChart({ data, unit = "people", labelWidth = 120 }: { data: { label: string; n: number }[]; unit?: string; labelWidth?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" horizontal={false} />
        <XAxis type="number" {...axis} allowDecimals={false} domain={[0, (max: number) => Math.max(max, 3)]} />
        <YAxis type="category" dataKey="label" {...axis} width={labelWidth} interval={0} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
        <Tooltip content={<Tip unit={unit} />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="n" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LikelihoodChart({ data }: { data: { label: string; n: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={32} allowDecimals={false} domain={[0, (max: number) => Math.max(max, 3)]} />
        <Tooltip content={<Tip unit="people" title={(l) => `Likelihood ${l} of 5`} />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="n" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((d) => (
            <Cell key={d.label} fill={Number(d.label) >= 4 ? "var(--accent)" : "color-mix(in oklab, var(--accent) 45%, var(--muted))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
