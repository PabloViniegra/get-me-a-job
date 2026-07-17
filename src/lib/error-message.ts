const GENERIC_FALLBACK = "Ha ocurrido un error inesperado.";

const NETWORK_PATTERNS = /(network|fetch|aborted|timeout|offline)/i;

export function friendlyErrorMessage(errorMessage: string): string {
  const cleaned = errorMessage
    .replace(/^TRPCClientError:\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();

  if (!cleaned) return GENERIC_FALLBACK;

  if (NETWORK_PATTERNS.test(cleaned)) {
    return "Sin conexión con el servidor. Comprueba tu red y vuelve a intentarlo.";
  }

  return cleaned;
}
