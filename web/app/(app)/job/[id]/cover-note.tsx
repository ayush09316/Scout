"use client";

import { getUserKey } from "@/lib/user-key";

import { useState, useTransition } from "react";
import { Check, Copy, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateCoverNote } from "@/lib/actions";
import { handleResult } from "@/lib/toast";

export function CoverNote({ jobId, initial }: { jobId: number; initial: { body: string; model: string } | null }) {
  const [note, setNote] = useState(initial);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const gen = () =>
    start(async () => {
      const res = await generateCoverNote(jobId, getUserKey());
      if (handleResult(res, "Cover note ready") && res.data) setNote(res.data);
    });

  const copy = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note.body);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Cover note"
        description={note ? `Drafted with ${note.model}` : "A short, specific note grounded in your resume"}
        action={
          note && (
            <Button size="icon-sm" variant="ghost" onClick={copy} aria-label="Copy cover note">
              {copied ? <Check className="text-good" /> : <Copy />}
            </Button>
          )
        }
      />
      <div className="p-4">
        {pending ? (
          <div className="space-y-2" aria-busy="true" aria-label="Generating">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : note ? (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-fg-muted">{note.body}</p>
        ) : null}
        <Button variant={note ? "outline" : "primary"} size="sm" className="mt-3 w-full" onClick={gen} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {note ? "Regenerate" : "Generate cover note"}
        </Button>
      </div>
    </Card>
  );
}
