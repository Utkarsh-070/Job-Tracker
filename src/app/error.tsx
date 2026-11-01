"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="standalone-state">
      <h1>
        Let’s try that again<span className="heading-dot">.</span>
      </h1>
      <p>
        The tracker couldn’t finish this request. Check your connection and try
        again.
      </p>
      <div>
        <Button onClick={reset}>Try again</Button>
        <Link className="button button-secondary" href="/">
          Back to applications
        </Link>
      </div>
    </main>
  );
}
