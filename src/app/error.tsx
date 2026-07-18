"use client";

import { useEffect } from "react";
import { friendlyErrorMessage } from "@/lib/error-message";
import { ErrorState } from "./_components/error-state";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[app:error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <ErrorState
        errorMessage={friendlyErrorMessage(error.message)}
        onRetry={reset}
      />
    </div>
  );
}
