"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setCronEnabled } from "@/lib/actions";
import { handleResult } from "@/lib/toast";

export function CronSwitch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();

  const toggle = (v: boolean) => {
    setOn(v);
    start(async () => {
      if (!handleResult(await setCronEnabled(v), v ? "Scheduled runs on" : "Scheduled runs paused")) setOn(!v);
    });
  };

  return (
    <label className="inline-flex h-9 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg shadow-card" data-testid="cron-switch">
      <span>Scheduled runs</span>
      <span className={on ? "text-good" : "text-fg-subtle"}>{on ? "On" : "Paused"}</span>
      <Switch checked={on} onCheckedChange={toggle} disabled={pending} aria-label="Scheduled runs" />
    </label>
  );
}
