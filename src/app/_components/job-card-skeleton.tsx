"use no memo";

import { Card, Skeleton } from "@heroui/react";

const TITLE_HEIGHT = "h-[22px]";
const BODY_HEIGHT = "h-[21px]";
const CAPTION_HEIGHT = "h-[17px]";

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
          <Skeleton className={`${CAPTION_HEIGHT} w-16 rounded-full`} />
        </div>
        <Skeleton className={`${CAPTION_HEIGHT} w-1/2 rounded-sm`} />
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
        <Skeleton className={`${CAPTION_HEIGHT} w-32 rounded-sm`} />
        <Skeleton className={`${CAPTION_HEIGHT} w-20 rounded-sm`} />
      </Card.Footer>
    </Card>
  );
}
