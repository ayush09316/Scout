import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { BackButton, RequestedPath, StatusPage } from "@/components/status-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage
      code="Error 404"
      title="Nothing on the radar here"
      description="The link may be mistyped, or the page was moved. Closed or merged jobs also drop off once they leave the index."
      detail={<RequestedPath />}
      actions={
        <>
          <Link href="/today" className={buttonClass("primary")}>
            Open Today
          </Link>
          <BackButton />
        </>
      }
    />
  );
}
