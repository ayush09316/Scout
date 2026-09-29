"use client";

import { toast } from "sonner";
import type { ActionResult } from "./actions";

export function handleResult<T>(res: ActionResult<T>, success?: string, opts?: { undo?: () => void }): res is { ok: true; data?: T } {
  if (res.ok) {
    if (success) toast.success(success, opts?.undo ? { action: { label: "Undo", onClick: opts.undo } } : undefined);
    return true;
  }
  if (res.demo) toast("Demo mode", { description: "This is a read-only public demo — changes aren't saved." });
  else toast.error(res.error);
  return false;
}
