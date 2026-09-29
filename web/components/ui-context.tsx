"use client";

import { createContext, useContext, useState } from "react";

type UI = { paletteOpen: boolean; setPaletteOpen: (v: boolean) => void; helpOpen: boolean; setHelpOpen: (v: boolean) => void; demo: boolean };

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  return <Ctx.Provider value={{ paletteOpen, setPaletteOpen, helpOpen, setHelpOpen, demo }}>{children}</Ctx.Provider>;
}

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error("UIProvider missing");
  return v;
}
