"use client";

import { Fragment } from "react";
import * as CM from "@radix-ui/react-context-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, CircleCheck, CircleX, ExternalLink, EyeOff, FileText, Globe, Link2, Send, SquareCheck, ThumbsUp, type LucideIcon } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import type { FeedbackAction } from "@/lib/db/schema";
import type { JobListItem } from "@/lib/queries";
import { useJobActions, type JobActions } from "@/lib/use-job-actions";

type Item = { key: string; label: string; icon: LucideIcon; kbd?: string; sep?: boolean; run: () => void };

export const menuContentClass =
  "z-50 min-w-[230px] max-w-[300px] overflow-hidden rounded-xl border border-border bg-surface p-1 text-fg shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";
export const menuItemClass =
  "relative flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-[13px] text-fg-muted outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[highlighted]:text-fg [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle data-[highlighted]:[&_svg]:text-fg pointer-coarse:h-10";
export const menuSeparatorClass = "-mx-1 my-1 h-px bg-border";

export function JobContextMenu({
  job,
  actions,
  hints,
  picked,
  onPick,
  onOpenChange,
  children,
}: {
  job: JobListItem;
  actions?: JobActions;
  hints?: boolean;
  picked?: boolean;
  onPick?: () => void;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactElement;
}) {
  const router = useRouter();
  const own = useJobActions();
  const acts = actions ?? own;
  const href = `/job/${job.id}`;
  const fb = (a: FeedbackAction) => () => acts.feedback([job], a);
  const copy = () =>
    navigator.clipboard
      .writeText(new URL(href, window.location.origin).toString())
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Couldn't copy the link"));
  const items: Item[] = [
    { key: "open", label: "Open", icon: FileText, kbd: hints ? "↵" : undefined, run: () => router.push(href) },
    { key: "tab", label: "Open in new tab", icon: ExternalLink, run: () => window.open(href, "_blank", "noopener,noreferrer") },
    { key: "posting", label: "Open posting", icon: Globe, run: () => window.open(job.url, "_blank", "noopener,noreferrer") },
    { key: "copy", label: "Copy link", icon: Link2, run: copy },
    ...(onPick ? [{ key: "pick", label: picked ? "Deselect" : "Select", icon: SquareCheck, kbd: hints ? "X" : undefined, sep: true, run: onPick }] : []),
    { key: "up", label: "Good match", icon: ThumbsUp, kbd: hints ? "U" : undefined, sep: !onPick, run: fb("up") },
    { key: "saved", label: "Save", icon: Bookmark, kbd: hints ? "S" : undefined, run: fb("saved") },
    { key: "applied", label: "Apply", icon: Send, kbd: hints ? "A" : undefined, run: fb("applied") },
    { key: "down", label: "Dismiss", icon: EyeOff, kbd: hints ? "D" : undefined, run: fb("down") },
    { key: "fit", label: "Label as fit", icon: CircleCheck, sep: true, run: () => acts.label([job], "fit") },
    { key: "no", label: "Label as not a fit", icon: CircleX, run: () => acts.label([job], "no") },
  ];
  return (
    <CM.Root modal={false} onOpenChange={onOpenChange}>
      <CM.Trigger asChild>{children}</CM.Trigger>
      <CM.Portal>
        <CM.Content collisionPadding={8} className={menuContentClass} data-testid="job-menu">
          <CM.Label className="truncate px-2 pt-1.5 pb-1 text-xs font-semibold text-fg" title={job.title}>
            {job.title}
          </CM.Label>
          {items.map((it) => (
            <Fragment key={it.key}>
              {it.sep && <CM.Separator className={menuSeparatorClass} />}
              <CM.Item className={menuItemClass} onSelect={it.run}>
                <it.icon aria-hidden />
                <span className="flex-1 truncate">{it.label}</span>
                {it.kbd && <Kbd className="ml-auto">{it.kbd}</Kbd>}
              </CM.Item>
            </Fragment>
          ))}
        </CM.Content>
      </CM.Portal>
    </CM.Root>
  );
}
