"use client";

import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;

export function PopoverContent({ children, className, align = "end", side = "bottom" }: { children: React.ReactNode; className?: string; align?: "start" | "center" | "end"; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={12}
        className={cn("z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-pop outline-none", className)}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
