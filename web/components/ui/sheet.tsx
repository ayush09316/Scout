"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = D.Root;

export function SheetContent({ children, title, description, className }: { children: React.ReactNode; title: string; description?: string; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-border bg-surface text-fg shadow-pop outline-none",
          className,
        )}
      >
        <D.Title className="sr-only">{title}</D.Title>
        <D.Description className="sr-only">{description ?? title}</D.Description>
        {children}
        <D.Close className="absolute top-3.5 right-3.5 rounded-md p-1 text-fg-subtle hover:bg-muted hover:text-fg" aria-label="Close">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
