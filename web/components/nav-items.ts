import { Activity, Inbox, Settings, SquareKanban, Tags } from "lucide-react";

export const NAV = [
  { href: "/today", label: "Today", icon: Inbox, key: "t" },
  { href: "/tracker", label: "Tracker", icon: SquareKanban, key: "r" },
  { href: "/label", label: "Label", icon: Tags, key: "l" },
  { href: "/health", label: "Health", icon: Activity, key: "h" },
  { href: "/settings", label: "Settings", icon: Settings, key: "s" },
] as const;
