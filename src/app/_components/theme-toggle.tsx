"use client";
"use no memo";

import { Button } from "@heroui/react/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark =
    mounted && (theme === "system" ? resolvedTheme : theme) === "dark";

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      document.documentElement.style.setProperty(
        "--toggle-x",
        `${rect.left + rect.width / 2}px`,
      );
      document.documentElement.style.setProperty(
        "--toggle-y",
        `${rect.top + rect.height / 2}px`,
      );
    }

    if (typeof document === "undefined" || !document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    document.startViewTransition(() => {
      setTheme(nextTheme);
    });
  };

  return (
    <Button
      ref={buttonRef}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDark}
      isIconOnly
      variant="secondary"
      onPress={handleToggle}
    >
      {isDark ? (
        <Sun aria-hidden="true" size={16} />
      ) : (
        <Moon aria-hidden="true" size={16} />
      )}
    </Button>
  );
}
