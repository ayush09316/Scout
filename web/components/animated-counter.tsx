"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0, duration = 900, className }: { value: number; prefix?: string; suffix?: string; decimals?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setShown(t === 1 ? null : value * easeOutExpo(t));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      setShown(null);
    };
  }, [value, duration]);

  const text = (shown ?? value).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
