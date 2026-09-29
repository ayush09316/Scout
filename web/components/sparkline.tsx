"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type Point = { week: string; opened: number; closed: number };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] shadow-pop">
      <p className="font-medium text-fg">Week of {p.week}</p>
      <p className="text-fg-muted">
        <span className="font-mono text-fg tabular-nums">{p.opened}</span> opened · <span className="font-mono text-fg tabular-nums">{p.closed}</span> closed
      </p>
    </div>
  );
}

export function VelocitySparkline({ data, height = 56, id }: { data: Point[]; height?: number; id: string }) {
  if (!data.length) return <div style={{ height }} className="flex items-center text-xs text-fg-subtle">No history yet</div>;
  return (
    <div style={{ height }} className="w-full" aria-label="12-week hiring velocity" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="week" hide />
          <Tooltip content={<Tip />} cursor={{ stroke: "var(--border-strong)" }} />
          <Area type="monotone" dataKey="opened" stroke="var(--accent)" strokeWidth={1.75} fill={`url(#spark-${id})`} isAnimationActive={false} dot={false} activeDot={{ r: 3, strokeWidth: 2, stroke: "var(--surface)" }} />
          <Area type="monotone" dataKey="closed" stroke="var(--fg-subtle)" strokeWidth={1.25} strokeDasharray="3 3" fill="none" isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
