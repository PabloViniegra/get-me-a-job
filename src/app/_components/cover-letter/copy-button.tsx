"use client";

import { Button } from "@heroui/react/button";
import { Check, Copy } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EASE_OUT_QUINT } from "@/lib/motion";

const COPIED_RESET_MS = 1500;

type CopyButtonProps = {
  text: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "tertiary" | "secondary";
};

export function CopyButton({
  text,
  label = "Copiar",
  size = "sm",
  variant = "tertiary",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <Button
      aria-live="polite"
      aria-label={copied ? "Carta copiada al portapapeles" : "Copiar carta"}
      size={size}
      variant={variant}
      onPress={handlePress}
      className="transition-transform duration-150 active:scale-[0.97]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <m.span
            key="copied"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT_QUINT }}
            className="inline-flex items-center gap-1.5"
          >
            <Check aria-hidden="true" size={14} strokeWidth={2} />
            Copiado
          </m.span>
        ) : (
          <m.span
            key="idle"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT_QUINT }}
            className="inline-flex items-center gap-1.5"
          >
            <Copy aria-hidden="true" size={14} strokeWidth={2} />
            {label}
          </m.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
