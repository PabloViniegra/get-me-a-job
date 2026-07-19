"use no memo";

import { Link } from "@heroui/react/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          {"// 404"}
        </span>
        <div className="flex items-center gap-2">
          <SearchX
            aria-hidden="true"
            size={16}
            className="shrink-0 text-muted"
          />
          <h1 className="text-base font-semibold text-foreground">
            Página no encontrada
          </h1>
        </div>
        <p className="max-w-md text-sm text-muted">
          La ruta que buscas no existe o se ha movido.
        </p>
        <Link href="/" className="py-1 text-sm">
          Volver al panel
        </Link>
      </div>
    </main>
  );
}
