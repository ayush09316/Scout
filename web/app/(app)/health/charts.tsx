"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";

const C1 = "var(--accent)";
const C2 = "oklch(0.7 0.12 195)";
const axis = { stroke: "var(--fg-subtle)", fontSize: 11, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />;

function Tip({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; fmt?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-fg">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-fg-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto pl-3 font-mono text-fg tabular-nums">{fmt ? fmt(p.value) : p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

type RunDatum = { day: string; fetched: number; new: number; scored: number };

export function RunsChart({ data }: { data: RunDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {grid}
        <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axis} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`)} />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span style={{ color: "var(--fg-muted)" }}>{v}</span>} />
        <Bar dataKey="new" name="new" fill={C1} radius={[4, 4, 0, 0]} maxBarSize={14} />
        <Bar dataKey="scored" name="scored" fill={C2} radius={[4, 4, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FetchedChart({ data }: { data: RunDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fetchedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C1} stopOpacity={0.25} />
            <stop offset="100%" stopColor={C1} stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axis} width={48} domain={[(min: number) => Math.floor((min - 100) / 500) * 500, (max: number) => Math.ceil((max + 100) / 500) * 500]} tickCount={5} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`} allowDecimals={false} />
        <Tooltip content={<Tip />} cursor={{ stroke: "var(--border-strong)" }} />
        <Area type="monotone" dataKey="fetched" name="fetched" stroke={C1} strokeWidth={2} fill="url(#fetchedFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CostChart({ data }: { data: { day: string; usd: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        {grid}
        <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axis} width={52} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
        <Tooltip content={<Tip fmt={(v) => `$${v.toFixed(4)}`} />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="usd" name="spend" fill={C1} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CalibrationChart({ data }: { data: { bin: number; predicted: number; observed: number }[] }) {
  const d = data.map((x) => ({ ...x, ideal: x.predicted }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={d} margin={{ top: 8, right: 12, left: -12, bottom: 12 }}>
        <CartesianGrid stroke="var(--border)" />
        <XAxis dataKey="predicted" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} {...axis} label={{ value: "predicted", position: "insideBottom", offset: -6, fontSize: 11, fill: "var(--fg-subtle)" }} />
        <YAxis type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} {...axis} width={40} />
        <Tooltip content={<Tip fmt={(v) => v.toFixed(2)} />} />
        <Line dataKey="ideal" name="perfect" stroke="var(--fg-subtle)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
        <Line dataKey="observed" name="observed" stroke={C1} strokeWidth={2} dot={false} />
        <Scatter dataKey="observed" name="observed" fill={C1} stroke="var(--surface)" strokeWidth={2} r={5} legendType="none" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
