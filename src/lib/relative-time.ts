import { formatDistanceStrict } from "date-fns";
import { es } from "date-fns/locale";

const FOUND_PREFIX = "Encontrado ";

export function relativeJobTime(date: Date, now: Date = new Date()): string {
  const span = formatDistanceStrict(date, now, {
    locale: es,
    addSuffix: false,
  });
  return `${FOUND_PREFIX}${span}`;
}
