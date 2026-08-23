import EventSource from "react-native-sse";
import { API_URL } from "./api";
import { tokenStore } from "./storage";

export type TokenStream = { close: () => void };

type StreamEvents = "snapshot" | "update" | "message" | "error" | "close";

export function openTokenStream(
  tokenId: string,
  handlers: {
    onSnapshot?: () => void;
    onUpdate?: () => void;
    onError?: () => void;
  },
): TokenStream {
  let closed = false;
  let es: InstanceType<typeof EventSource> | null = null;

  (async () => {
    const access = await tokenStore.getAccess();
    if (!access || closed) return;
    es = new EventSource<StreamEvents>(`${API_URL}/api/scheduling/tokens/${tokenId}/stream`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    es.addEventListener("snapshot", () => handlers.onSnapshot?.());
    es.addEventListener("update", () => handlers.onUpdate?.());
    es.addEventListener("error", () => {
      if (!closed) handlers.onError?.();
    });
    es.addEventListener("close", () => {
      if (!closed) handlers.onError?.();
    });
  })();

  return {
    close() {
      closed = true;
      es?.close();
    },
  };
}
