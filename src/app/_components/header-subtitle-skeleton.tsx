import { Skeleton } from "@heroui/react/skeleton";

const SUBTITLE_HEIGHT = "h-[17px]";

export function HeaderSubtitleSkeleton() {
  return (
    <Skeleton
      aria-hidden="true"
      className={`${SUBTITLE_HEIGHT} w-64 rounded-sm`}
    />
  );
}
