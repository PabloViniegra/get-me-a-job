type DashboardResultCountProps = {
  visible: number;
  total: number;
};

export function DashboardResultCount({
  visible,
  total,
}: DashboardResultCountProps) {
  return (
    <p aria-live="polite" className="text-sm text-muted">
      Mostrando {visible} de {total} ofertas
    </p>
  );
}
