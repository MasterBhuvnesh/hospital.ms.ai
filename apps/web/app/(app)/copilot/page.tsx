"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import Banner from "@/components/Banner";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export default function CopilotPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I am your care copilot. Ask me about your visits, prescriptions, lab results or bills - for example: \"When is my next appointment?\" or \"What did my last blood test say?\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [erasing, setErasing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setSending(true);
    try {
      const res = await api.ai.chat(text, nextMessages.slice(1, -1));
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            res.content?.trim() ||
            "(The copilot returned an empty answer - the AI backend may still be waking up. Try again.)",
        },
      ]);
    } catch (err) {
      setMessages(nextMessages);
      setError(err instanceof Error ? err.message : "The copilot could not reply.");
    } finally {
      setSending(false);
    }
  }

  async function erase() {
    setErasing(true);
    try {
      await api.ai.memoryErase();
      setConfirmErase(false);
      setMessages([
        { role: "assistant", content: "Memory erased. We are starting fresh - how can I help?" },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not erase memory.");
      setConfirmErase(false);
    } finally {
      setErasing(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">AI copilot</h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            Grounded in your own records - never medical advice. Memory is yours to erase.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-danger-border bg-background text-danger hover:bg-danger-background"
          onClick={() => setConfirmErase(true)}
        >
          Erase memory
        </Button>
      </div>

      {error && (
        <Banner kind="warn" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <Card className="rounded-lg border-border shadow-none">
        <CardContent className="p-5 pt-5 font-[350]">
          <div
            ref={scrollRef}
            className="flex max-h-[52vh] min-h-72 flex-col gap-3 overflow-y-auto px-0.5"
            aria-live="polite"
          >
            {messages.map((m, i) =>
              m.content ? (
                <div
                  key={i}
                  className={cn(
                    "max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-sm leading-[1.55]",
                    m.role === "user"
                      ? "self-end rounded-br-sm bg-primary text-primary-foreground"
                      : "self-start rounded-bl-sm bg-surface-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={i}
                  aria-label="Thinking"
                  className="flex items-center gap-1 self-start rounded-lg rounded-bl-sm bg-surface-muted px-4 py-3"
                >
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      style={{ animationDelay: `${d}ms` }}
                      className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                    />
                  ))}
                </div>
              ),
            )}
          </div>

          <form className="mt-4 flex gap-2" onSubmit={send}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your care..."
              disabled={sending}
              maxLength={2000}
            />
            <Button type="submit" disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="animate-spin" aria-hidden /> : "Send"}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-caption font-[350] text-subtle">
        The copilot keeps a rolling history of the last 10 turns per conversation.{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            router.refresh();
          }}
          className="font-[400] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Reset view
        </a>
      </p>

      <Modal
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        title="Erase copilot memory?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmErase(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={erasing} onClick={erase}>
              {erasing ? "Erasing..." : "Yes, erase everything"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Everything the copilot remembers about you is permanently deleted and the erasure is
          audited. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
