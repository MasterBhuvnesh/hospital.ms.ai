"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Banner from "@/components/Banner";
import Modal from "@/components/Modal";

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
      <div className="page-head">
        <div>
          <h1>AI copilot</h1>
          <p>Grounded in your own records - never medical advice. Memory is yours to erase.</p>
        </div>
        <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmErase(true)}>
          Erase memory
        </button>
      </div>

      {error && (
        <Banner kind="warn" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <div className="card">
        <div className="chat-window" ref={scrollRef}>
          {messages.map((m, i) =>
            m.content ? (
              <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
                {m.content}
              </div>
            ) : (
              <div key={i} className="bubble bubble-ai typing-dots" aria-label="Thinking">
                <span />
                <span />
                <span />
              </div>
            ),
          )}
        </div>

        <form className="chat-bar" onSubmit={send}>
          <input
            className="input grow"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your care..."
            disabled={sending}
            maxLength={2000}
          />
          <button className="btn btn-primary" disabled={sending || !input.trim()}>
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>

      <p className="center muted tiny mt16">
        The copilot keeps a rolling history of the last 10 turns per conversation.{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); router.refresh(); }}>
          Reset view
        </a>
      </p>

      <Modal
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        title="Erase copilot memory?"
        footer={
          <>
            <button className="btn" onClick={() => setConfirmErase(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" disabled={erasing} onClick={erase}>
              {erasing ? "Erasing..." : "Yes, erase everything"}
            </button>
          </>
        }
      >
        <p className="muted small">
          Everything the copilot remembers about you is permanently deleted and the erasure is
          audited. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
