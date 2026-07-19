"use client";

import { useEffect, useRef } from "react";

type LoadMoreSentinelProps = {
  onIntersect: () => void;
  enabled: boolean;
};

export function LoadMoreSentinel({
  onIntersect,
  enabled,
}: LoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          callbackRef.current();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return <div ref={ref} aria-hidden="true" className="h-1 w-full" />;
}
