"use client";

import { Dialog, DialogContent } from "./ui/dialog";
import { Kbd } from "./ui/kbd";
import { useUI } from "./ui-context";

const groups = [
  { title: "Global", items: [["⌘ K", "Command palette"], ["/", "Search"], ["?", "This help"], ["G T", "Go to Today"], ["G R", "Go to Tracker"], ["G L", "Go to Label"], ["G H", "Go to Health"], ["G S", "Go to Settings"]] },
  { title: "Today", items: [["J / K", "Next / previous"], ["Enter", "Open job"], ["U", "Thumbs up"], ["D", "Thumbs down"], ["S", "Save"], ["A", "Apply (opens link)"], ["1 2 3", "Switch tab"]] },
  { title: "Label", items: [["Y", "Fit"], ["N", "Not a fit"], ["K", "Back"], ["→", "Skip"]] },
];

export function ShortcutsHelp() {
  const { helpOpen, setHelpOpen } = useUI();
  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent title="Keyboard shortcuts" className="max-w-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <p className="mt-0.5 text-xs text-fg-muted">Scout is built to be driven from the keyboard.</p>
        </div>
        <div className="grid max-h-[65vh] gap-6 overflow-y-auto px-5 py-4 sm:grid-cols-3">
          {groups.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-fg-subtle uppercase">{g.title}</h3>
              <ul className="space-y-1.5">
                {g.items.map(([k, label]) => (
                  <li key={k + label} className="flex items-center justify-between gap-3 text-sm text-fg-muted">
                    <span>{label}</span>
                    <span className="flex gap-1">
                      {k.split(" ").map((p) => (
                        <Kbd key={p}>{p}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
