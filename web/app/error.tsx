"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { ErrorReference, StatusPage } from "@/components/status-page";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="Error 500"
      title="Couldn’t load this page"
      description="Something broke on our side. Your jobs and tracker are safe — try again, and if it keeps happening, note the reference below."
      detail={<ErrorReference digest={error.digest} />}
      actions={
        <>
          <Button type="button" variant="primary" onClick={reset}>
            <RotateCw aria-hidden />
            Try again
          </Button>
          <Link href="/today" className={buttonClass("ghost")}>
            Back to Today
          </Link>
        </>
      }
    />
  );
}
