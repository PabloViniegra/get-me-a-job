import { Skeleton } from "@heroui/react/skeleton";

const INPUT_HEIGHT = "h-12";
const BUTTON_HEIGHT = "h-8";

export function JobsFilterBarSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <Skeleton className={`${INPUT_HEIGHT} w-full rounded-xl`} />
      <Skeleton className={`${BUTTON_HEIGHT} w-24 rounded-lg`} />
    </div>
  );
}
