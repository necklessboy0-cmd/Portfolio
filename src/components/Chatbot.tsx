"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { quickQuestions } from "@/data/resume";
import { answerAssistant } from "@/lib/chatEngine";
import { SendIcon, SparklesIcon } from "./icons";

type Msg = { role: "user" | "bot"; text: string };

const BOOT_MSG: Msg = {
  role: "bot",
  text: "Hi! 👋 I'm the portfolio assistant. Ask me anything about Muhammad Taswaib — skills, projects, certificates, education or contact details.",
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([BOOT_MSG]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setMsgs((prev) => [...prev, { role: "user", text }]);
      setInput("");
      setTimeout(() => {
        setMsgs((prev) => [...prev, { role: "bot", text: answerAssistant(text) }]);
      }, 450);
    },
    [],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <>
      {/* toggle button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-nebula-400/30 bg-gradient-to-tr from-nebula-600 via-fuchsia-500 to-nebula-400 text-white shadow-[0_8px_35px_-6px_rgba(168,85,247,0.75)] transition-shadow hover:shadow-[0_10px_45px_-4px_rgba(217,70,239,0.8)]"
        aria-label={open ? "Close chatbot" : "Open chatbot"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="text-lg font-bold"
            >
              ✕
            </motion.span>
          ) : (
            <motion.span
              key="spark"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <SparklesIcon size={26} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[78px] right-5 z-[70] flex w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl border border-white/12 bg-space-900/95 shadow-[0_25px_80px_-20px_rgba(124,58,237,0.7)] backdrop-blur-2xl"
            style={{ maxHeight: "min(620px, calc(100vh - 120px))" }}
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-nebula-600 to-fuchsia-500 text-white shadow-lg">
                <SparklesIcon size={22} />
              </span>
              <div>
                <p className="font-name text-sm font-bold italic text-white">
                  Portfolio AI
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-nebula-300">
                  Answers from the CV &amp; projects
                </p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                online
              </span>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "rounded-br-md bg-nebula-600/70 text-white"
                        : "rounded-bl-md border border-white/10 bg-white/6 text-nebula-300"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* suggestions */}
            {msgs.length <= 2 && (
              <div className="flex flex-wrap gap-2 px-5 pt-2 pb-1">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="chip cursor-pointer rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-nebula-300 transition-colors hover:border-fuchsia-400/60 hover:text-fuchsia-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-3 border-t border-white/10 px-5 py-3.5"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-nebula-300/50 focus:border-nebula-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nebula-600 text-white transition-colors hover:bg-nebula-500 disabled:opacity-50"
              >
                <SendIcon size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}