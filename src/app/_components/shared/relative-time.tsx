import { relativeJobTime } from "@/lib/relative-time";

export function RelativeTime({ date }: { date: Date }) {
  return <>{relativeJobTime(date)}</>;
}
