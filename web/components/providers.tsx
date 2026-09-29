"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import * as Tooltip from "@radix-ui/react-tooltip";
import { UIProvider } from "./ui-context";

function Toasts() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      offset={{ bottom: 88, right: 16 }}
      mobileOffset={{ bottom: 88 }}
      toastOptions={{ classNames: { toast: "!rounded-xl !border-border !bg-surface !text-fg !shadow-pop", description: "!text-fg-muted" } }}
    />
  );
}

export function Providers({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <Tooltip.Provider delayDuration={300}>
        <UIProvider demo={demo}>
          {children}
          <Toasts />
        </UIProvider>
      </Tooltip.Provider>
    </ThemeProvider>
  );
}
