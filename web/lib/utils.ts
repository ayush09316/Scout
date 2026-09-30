import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string | null, now = Date.now()) {
  if (!iso) return "—";
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (86400 * 30))}mo`;
}

export function daysSince(iso: string, now = Date.now()) {
  return Math.floor((now - new Date(iso).getTime()) / 86400000);
}

export function pct(v: number | null | undefined, digits = 0) {
  return v == null ? "—" : `${(v * 100).toFixed(digits)}%`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function istParts(d: string | Date) {
  const t = new Date(new Date(d).getTime() + 330 * 60000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes() };
}

export function istDate(d: string | Date, withYear = false) {
  const p = istParts(d);
  return `${p.d} ${MONTHS[p.m]}${withYear ? ` ${p.y}` : ""}`;
}

export function istDateTime(d: string | Date) {
  const p = istParts(d);
  const h12 = p.h % 12 || 12;
  return `${p.d} ${MONTHS[p.m]}, ${h12}:${String(p.min).padStart(2, "0")} ${p.h < 12 ? "am" : "pm"} IST`;
}
