"use client";

import { useSyncExternalStore } from "react";

const STORAGE = "scout:gemini-key";
const EVENT = "scout:gemini-key";

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function getUserKey(): string | undefined {
  return read() ?? undefined;
}

export function setUserKey(key: string | null) {
  try {
    if (key) localStorage.setItem(STORAGE, key);
    else localStorage.removeItem(STORAGE);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function useUserKey(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function maskKey(key: string) {
  return key.length > 10 ? `${key.slice(0, 4)}••••${key.slice(-4)}` : "••••";
}
