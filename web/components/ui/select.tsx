"use client";

import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export type SelectOption = { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = "sm",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const enc = (v: string) => (v === "" ? ALL : v);
  const dec = (v: string) => (v === ALL ? "" : v);
  return (
    <S.Root value={enc(value)} onValueChange={(v) => onChange(dec(v))}>
      <S.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-fg shadow-card transition-colors hover:bg-muted data-[state=open]:border-accent/60 data-[state=open]:bg-muted",
          size === "sm" ? "h-8 text-[13px]" : "h-10 w-full text-sm",
          className,
        )}
      >
        <span className="truncate"><S.Value /></span>
        <S.Icon>
          <ChevronDown className="size-3.5 text-fg-subtle transition-transform [[data-state=open]_&]:rotate-180" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(var(--radix-select-content-available-height),320px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <S.Viewport>
            {options.map((o) => (
              <S.Item
                key={o.value || ALL}
                value={enc(o.value)}
                className="relative flex h-8 cursor-pointer select-none items-center gap-2 rounded-md pl-7 pr-3 text-[13px] text-fg-muted outline-none data-[highlighted]:bg-muted data-[highlighted]:text-fg data-[state=checked]:text-fg"
              >
                <S.ItemIndicator className="absolute left-2 inline-flex">
                  <Check className="size-3.5 text-accent" />
                </S.ItemIndicator>
                <S.ItemText>{o.label}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
