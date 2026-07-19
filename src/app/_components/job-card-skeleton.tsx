"use no memo";

import { Card } from "@heroui/react/card";
import { Skeleton } from "@heroui/react/skeleton";

const TITLE_HEIGHT = "h-[22px]";
const BODY_HEIGHT = "h-[21px]";
const CAPTION_HEIGHT = "h-[17px]";
const CHIP_HEIGHT = "h-6";
const ICON_BOX = "size-[17px]";

export function JobCardSkeleton() {
  return (
    <Card
      className="h-full rounded-lg border border-border p-4"
      aria-hidden="true"
      role="presentation"
    >
      <Card.Header className="flex-col items-stretch gap-2">
        <div className="flex flex-row items-start justify-between gap-3">
          <Skeleton className={`${TITLE_HEIGHT} w-2/3 rounded-sm`} />
          <Skeleton className={`${CHIP_HEIGHT} w-16 rounded-full`} />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Skeleton className={`${CAPTION_HEIGHT} w-12 rounded-sm`} />
          <span aria-hidden="true" className="text-border-secondary">
            ·
          </span>
          <Skeleton className={`${CAPTION_HEIGHT} w-32 rounded-sm`} />
        </div>
      </Card.Header>
      <Card.Content className="gap-3">
        <div className="flex flex-col gap-[3px]">
          <Skeleton className={`${BODY_HEIGHT} w-full rounded-sm`} />
          <Skeleton className={`${BODY_HEIGHT} w-full rounded-sm`} />
          <Skeleton className={`${BODY_HEIGHT} w-3/4 rounded-sm`} />
        </div>
        <Skeleton className={`${BODY_HEIGHT} w-32 rounded-sm`} />
        <div className="flex flex-col gap-1 pt-1">
          <Skeleton className={`${CAPTION_HEIGHT} w-28 rounded-sm`} />
          <Skeleton className={`${BODY_HEIGHT} w-5/6 rounded-sm`} />
        </div>
      </Card.Content>
      <Card.Footer className="flex flex-row items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <Skeleton className={`${ICON_BOX} rounded-full`} />
          <Skeleton className={`${CAPTION_HEIGHT} w-[5.75rem] rounded-sm`} />
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Skeleton className={`${CAPTION_HEIGHT} w-16 rounded-sm`} />
          <Skeleton className={`${ICON_BOX} rounded-sm`} />
        </span>
      </Card.Footer>
    </Card>
  );
}
