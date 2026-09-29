"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlarmClock, Bell, BellOff, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { dismissReminder, snoozeReminder } from "@/lib/actions";
import type { ReminderItem } from "@/lib/intel";
import { handleResult } from "@/lib/toast";
import { cn, formatDateTime } from "@/lib/utils";

const KIND: Record<string, string> = { follow_up: "Follow up", interview_prep: "Interview prep", offer_deadline: "Offer deadline" };

export function RemindersBell({ items, className }: { items: ReminderItem[]; className?: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const list = items.filter((r) => !hidden.has(r.id));

  const act = (r: ReminderItem, kind: "done" | "snooze") =>
    start(async () => {
      const res = kind === "done" ? await dismissReminder(r.id) : await snoozeReminder(r.id, 3);
      if (handleResult(res, kind === "done" ? "Reminder done" : "Snoozed for 3 days")) {
        setHidden((h) => new Set(h).add(r.id));
        router.refresh();
      }
    });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Draft copied");
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        aria-label={list.length ? `${list.length} reminders due` : "Reminders"}
        data-testid="reminders-bell"
        className={cn("relative inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-muted hover:text-fg data-[state=open]:bg-muted", className)}
      >
        <Bell className="size-4" aria-hidden />
        {list.length > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] leading-4 font-medium text-accent-fg tabular-nums">{list.length}</span>
        )}
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Reminders</h2>
            <p className="text-xs text-fg-muted">{list.length ? `${list.length} due` : "You're all caught up"}</p>
          </div>
        </div>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <BellOff className="size-5 text-fg-subtle" aria-hidden />
            <p className="text-[13px] text-fg-muted">Follow-ups and prep nudges for tracked jobs show up here.</p>
          </div>
        ) : (
          <ul className="max-h-[min(70vh,460px)] divide-y divide-border overflow-y-auto" data-testid="reminders-list">
            {list.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-wide text-accent uppercase">{KIND[r.kind] ?? r.kind}</p>
                    <Link href={`/job/${r.jobId}`} className="mt-0.5 block truncate text-[13px] font-medium text-fg hover:text-accent">
                      {r.title}
                    </Link>
                    <p className="truncate text-xs text-fg-subtle">
                      {r.companyName} · due {formatDateTime(r.dueAt)}
                    </p>
                  </div>
                </div>
                {r.draft && (
                  <div className="group relative mt-2 rounded-lg border border-border bg-surface-2 p-2.5 pr-9">
                    <p className="line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">{r.draft}</p>
                    <button onClick={() => copy(r.draft!)} aria-label="Copy draft" className="absolute top-1.5 right-1.5 rounded-md p-1 text-fg-subtle hover:bg-muted hover:text-fg">
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                )}
                <div className="mt-2 flex gap-1.5">
                  <button disabled={pending} onClick={() => act(r, "done")} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs font-medium text-fg shadow-card hover:bg-surface-2 disabled:opacity-50">
                    <Check className="size-3.5 text-good" aria-hidden />
                    Done
                  </button>
                  <button disabled={pending} onClick={() => act(r, "snooze")} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-muted hover:bg-muted hover:text-fg disabled:opacity-50">
                    <AlarmClock className="size-3.5" aria-hidden />
                    Snooze 3 days
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
