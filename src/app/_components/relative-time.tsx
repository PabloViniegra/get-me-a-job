"use client";

import { useEffect, useState } from "react";

const PLACEHOLDER_CLASS =
  "inline-block h-[17px] w-[5.75rem] rounded-sm bg-foreground/10 align-middle motion-safe:animate-pulse";

export function RelativeTime({ date }: { date: Date }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void import("@/lib/relative-time").then(({ relativeJobTime }) => {
      if (mounted) {
        setText(relativeJobTime(date));
      }
    });
    return () => {
      mounted = false;
    };
  }, [date]);

  if (text === null) {
    return <span aria-hidden="true" className={PLACEHOLDER_CLASS} />;
  }

  return <>{text}</>;
}
