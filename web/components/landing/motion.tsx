"use client";

import { useEffect, useRef, useState } from "react";

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function LandingFX() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lx");
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          if (el.hasAttribute("data-reveal")) el.classList.add("is-in");
          if (el.hasAttribute("data-inview")) el.classList.add("in-view");
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    root.querySelectorAll("[data-reveal],[data-inview]").forEach((el) => io.observe(el));
    root.classList.add("lx-ready");

    const nav = root.querySelector<HTMLElement>("[data-lx-nav]");
    const onScroll = () => nav?.setAttribute("data-scrolled", String(window.scrollY > 8));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const onMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".lx-spot");
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    root.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function useInView<T extends Element>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return [ref, inView] as const;
}

export function tween(from: number, to: number, ms: number, onFrame: (v: number) => void) {
  let raf = 0;
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    onFrame(from + (to - from) * e);
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export function CountUp({ value, delay = 0, duration = 1400, className }: { value: number; delay?: number; duration?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!inView || reducedMotion()) return;
    let stop = () => {};
    setShown(0);
    const t = setTimeout(() => {
      stop = tween(0, value, duration, (v) => setShown(Math.round(v)));
    }, delay);
    return () => {
      clearTimeout(t);
      stop();
    };
  }, [inView, value, delay, duration]);
  return (
    <span ref={ref} className={className}>
      {fmt(shown)}
    </span>
  );
}
