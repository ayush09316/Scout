"use client";

import { useEffect } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { RotateCw } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { ErrorReference, StatusPage } from "@/components/status-page";
import "./globals.css";

const THEME = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <title>Something went wrong · Scout</title>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body className="font-sans antialiased">
        <StatusPage
          code="Application error"
          title="Couldn’t load this page"
          description="A critical error stopped Scout from loading. Your jobs and tracker are untouched — try again, or reload Today."
          detail={<ErrorReference digest={error.digest} />}
          actions={
            <>
              <Button type="button" variant="primary" onClick={reset}>
                <RotateCw aria-hidden />
                Try again
              </Button>
              <a href="/today" className={buttonClass("ghost")}>
                Back to Today
              </a>
            </>
          }
        />
      </body>
    </html>
  );
}
