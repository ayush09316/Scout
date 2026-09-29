import { Activity, Inbox, Lightbulb, MessagesSquare, ScanSearch, Settings, SquareKanban, Tags } from "lucide-react";

export const NAV = [
  { href: "/today", label: "Today", icon: Inbox, key: "t", group: "Work" },
  { href: "/tracker", label: "Tracker", icon: SquareKanban, key: "r", group: "Work" },
  { href: "/label", label: "Label", icon: Tags, key: "l", group: "Work" },
  { href: "/search", label: "Search", icon: ScanSearch, key: "f", group: "Explore" },
  { href: "/insights", label: "Insights", icon: Lightbulb, key: "i", group: "Explore" },
  { href: "/chat", label: "Chat", icon: MessagesSquare, key: "c", group: "Explore" },
  { href: "/health", label: "Health", icon: Activity, key: "h", group: "System" },
  { href: "/settings", label: "Settings", icon: Settings, key: "s", group: "System" },
] as const;

export const NAV_GROUPS = ["Work", "Explore", "System"] as const;

export const MOBILE_PRIMARY = ["/today", "/tracker", "/search", "/chat"] as const;
