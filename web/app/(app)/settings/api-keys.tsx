"use client";

import { Check, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { testGeminiKey } from "@/lib/actions";
import { maskKey, setUserKey, useUserKey } from "@/lib/user-key";

export function ApiKeys({ serverKey }: { serverKey: boolean }) {
  const saved = useUserKey();
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await testGeminiKey(value);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setUserKey(value.trim());
      setValue("");
      toast.success("Key verified and saved in this browser");
    });

  const status = saved ? (
    <Badge tone="good">Using your key</Badge>
  ) : serverKey ? (
    <Badge tone="accent">Using server key</Badge>
  ) : (
    <Badge tone="neutral">No key · fallbacks on</Badge>
  );

  return (
    <Card id="api-keys" className="scroll-mt-6">
      <CardHeader title="API keys" description="Bring your own Gemini key to unlock AI tailoring, interview prep and cover notes." action={status} />
      <div className="space-y-4 p-4">
        {saved ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-good/10 text-good">
                <Check className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-fg">Gemini</p>
                <p className="font-mono text-xs text-fg-subtle">{maskKey(saved)}</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => (setUserKey(null), toast("Key removed from this browser"))}>
              <Trash2 />
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input
                aria-label="Gemini API key"
                type={show ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && value.trim() && save()}
                placeholder="AIza…"
                className="h-10 w-full rounded-lg border border-border bg-surface pr-10 pl-9 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide key" : "Show key"}
                className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:bg-muted hover:text-fg"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button variant="primary" className="h-10" disabled={!value.trim() || pending} onClick={save}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
              Verify & save
            </Button>
          </div>
        )}
        <div className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-good" aria-hidden />
          <p>
            Stored only in this browser&apos;s local storage and sent with your own AI requests. The server uses it for that request and never saves or logs it.{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
              Get a free key
            </a>
            . Daily job scoring runs on a schedule and keeps using the server&apos;s keys.
          </p>
        </div>
      </div>
    </Card>
  );
}
