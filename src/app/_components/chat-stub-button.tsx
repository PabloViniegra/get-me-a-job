"use client";
"use no memo";

import { Button } from "@heroui/react";
import { MessageCircle } from "lucide-react";
import { sileo } from "sileo";

export const CHAT_STUB_TITLE = "Chat no disponible aún";
export const CHAT_STUB_DESCRIPTION = "Pendiente de Epic 4";

export function ChatStubButton() {
  return (
    <Button
      aria-label={CHAT_STUB_TITLE}
      variant="secondary"
      onPress={() =>
        sileo.show({
          title: CHAT_STUB_TITLE,
          description: CHAT_STUB_DESCRIPTION,
        })
      }
    >
      <MessageCircle aria-hidden="true" size={16} />
      Chat
    </Button>
  );
}
