"use client";

import { Button } from "@heroui/react/button";
import { BorderBeam } from "border-beam";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { RelativeTime } from "../shared/relative-time";
import { ThemeToggle } from "../shared/theme-toggle";
import { HeaderSubtitleSkeleton } from "./header-subtitle-skeleton";

type DashboardHeaderProps = {
  actions?: ReactNode;
  subtitleLabel: number | null;
  isSubtitleLoading: boolean;
  newestCreatedAt: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function DashboardHeader({
  actions,
  subtitleLabel,
  isSubtitleLoading,
  newestCreatedAt,
  isRefreshing,
  onRefresh,
}: DashboardHeaderProps) {
  const { resolvedTheme } = useTheme();
  const beamTheme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
          Get{" "}
          <span className="font-mono font-medium tracking-normal text-muted">
            me
          </span>{" "}
          a job
        </h1>
        {isSubtitleLoading ? (
          <HeaderSubtitleSkeleton />
        ) : subtitleLabel !== null ? (
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            dashboard · {subtitleLabel}{" "}
            {subtitleLabel === 1 ? "oferta" : "ofertas"}
            {newestCreatedAt ? (
              <>
                {" · más reciente "}
                <RelativeTime date={newestCreatedAt} />
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <BorderBeam
          size="sm"
          colorVariant="ocean"
          theme={beamTheme}
          active={isRefreshing}
          duration={1.2}
          brightness={1.8}
        >
          <Button
            aria-label={
              isRefreshing ? "Recargando datos" : "Actualizar ofertas"
            }
            variant="secondary"
            onPress={onRefresh}
            isDisabled={isRefreshing}
            className="transition-transform duration-150 active:scale-[0.97]"
          >
            {isRefreshing ? (
              <LoaderCircle
                aria-hidden="true"
                size={16}
                className="motion-safe:animate-spin"
              />
            ) : (
              <RefreshCw size={16} aria-hidden="true" />
            )}
            {isRefreshing ? "Recargando…" : "Actualizar"}
          </Button>
        </BorderBeam>
        <ThemeToggle />
      </div>
    </header>
  );
}
