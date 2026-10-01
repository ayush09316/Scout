"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorReference } from "@/components/status-page";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <Card role="alert" className="max-w-xl p-6">
        <div className="flex size-9 items-center justify-center rounded-lg border border-bad/25 bg-bad-soft text-bad">
          <TriangleAlert className="size-4" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-fg">Couldn’t load this page</h1>
        <p className="mt-1 text-sm text-fg-muted">Something went wrong while loading. Your jobs, labels and tracker are safe — try again, or head back to Today.</p>
        {error.digest && (
          <div className="mt-3">
            <ErrorReference digest={error.digest} />
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" size="sm" onClick={reset}>
            <RotateCw aria-hidden />
            Try again
          </Button>
          <Link href="/today" className={buttonClass("outline", "sm")}>
            Back to Today
          </Link>
        </div>
      </Card>
    </div>
  );
}
