import { Button } from "@heroui/react/button";
import { RefreshCw } from "lucide-react";
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
        <Button
          aria-label="Actualizar ofertas"
          variant="secondary"
          onPress={onRefresh}
          isDisabled={isRefreshing}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
