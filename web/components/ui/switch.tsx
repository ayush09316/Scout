"use client";

import { useState } from "react";
import * as S from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, onCheckedChange, ...props }: S.SwitchProps) {
  const [armed, setArmed] = useState(false);
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong transition-colors data-[state=checked]:bg-accent disabled:opacity-50",
        className,
      )}
      onCheckedChange={(v) => {
        setArmed(true);
        onCheckedChange?.(v);
      }}
      {...props}
    >
      <S.Thumb className={cn("block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]", armed && "ap-pop-armed")} />
    </S.Root>
  );
}
