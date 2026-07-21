import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <section className="flex w-full max-w-7xl flex-col gap-4 p-4">
      {children}
    </section>
  );
}
