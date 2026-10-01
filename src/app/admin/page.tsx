"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useResumeRefresh } from "@/components/ResumeProvider";

// ----------------------------------------------------------------------------
// Private admin assistant — NOT linked anywhere on the public site.
// Login with the admin password, describe a change in plain language,
// review the parsed preview, then confirm to apply it everywhere
// (website + downloadable CV). Supports uploading certificate files.
// ----------------------------------------------------------------------------

type Msg =
  | { role: "user"; text: string }
  | { role: "bot"; text: string }
  | {
      role: "confirm";
      text: string;
      preview: string[];
      ops: unknown;
      fileUrl?: string;
    };

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text:
        "Private assistant ready. Tell me what to add or change — for example:\n\n" +
        "• “Add certificate: Deep Learning, issuer Coursera, 2025, link https://…, skills: Python, AI”\n" +
        "• “Add course: Financial Modeling, issuer CFI”\n" +
        "• “Add project: My App, link https://…, tech: Next.js, AI”\n" +
        "• “Add skills: SQL, Power BI”\n" +
        "• “Update email: me@example.com”\n\n" +
        "You can also attach a certificate file (PDF/JPG/PNG) — upload it first, then describe the entry and I'll link it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const refreshSite = useResumeRefresh();

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((j: { authenticated: boolean }) => setAuthed(j.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        const j = (await res.json()) as { error?: string };
        setLoginError(j.error ?? "Login failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthed(false);
    setPassword("");
  };

  const uploadFile = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (res.ok) {
        const j = (await res.json()) as { url: string; filename: string };
        setPendingFile({ url: j.url, name: j.filename });
        setMsgs((prev) => [
          ...prev,
          { role: "bot", text: `📎 Uploaded: ${j.filename}\nNow tell me what this is — e.g. “Add certificate: <name>, issuer <org>, 2025” — and I'll attach this file as its clickable link.` },
        ]);
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setMsgs((prev) => [...prev, { role: "bot", text: `Upload failed: ${j.error ?? "unknown error"}` }]);
      }
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const parse = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      setMsgs((prev) => [...prev, { role: "user", text }]);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/admin/mutate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "parse", message: text }),
        });
        const j = (await res.json()) as
          | { ok: true; ops: unknown; preview: string[]; note?: string }
          | { ok: false; help: string };

        if (j.ok) {
          const withFile = pendingFile
            ? [...j.preview, `Attached file → ${pendingFile.url}`]
            : j.preview;
          setMsgs((prev) => [
            ...prev,
            {
              role: "confirm",
              text: "Here's what I'll add — confirm to apply:",
              preview: withFile,
              ops: j.ops,
              fileUrl: pendingFile?.url,
            },
          ]);
          if (pendingFile) setPendingFile(null);
        } else {
          setMsgs((prev) => [...prev, { role: "bot", text: `🤔 ${j.help}` }]);
        }
      } catch {
        setMsgs((prev) => [...prev, { role: "bot", text: "Something went wrong — try again." }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, pendingFile],
  );

  const confirm = useCallback(
    async (msg: Extract<Msg, { role: "confirm" }>, index: number) => {
      setBusy(true);
      try {
        let ops = msg.ops;
        // If a file was attached, weave its URL into the first op's link field
        if (msg.fileUrl && Array.isArray(ops) && ops.length > 0) {
          ops = ops.map((op) => {
            const o = op as { type: string; [k: string]: unknown };
            const entryKey = ["certificate", "education", "project", "course", "experience"].find((k) => o[k]);
            if (entryKey) {
              const entry = o[entryKey] as Record<string, unknown>;
              if (!entry.link) entry.link = msg.fileUrl;
            }
            return o;
          });
        }
        const res = await fetch("/api/admin/mutate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm", ops }),
        });
        const j = (await res.json()) as {
          ok: boolean;
          message?: string;
          error?: string;
          persisted?: string;
          commitUrl?: string;
        };
        // Mark the confirm message as consumed
        setMsgs((prev) => prev.filter((_, i) => i !== index));
        if (j.ok) {
          const where =
            j.persisted === "github"
              ? "Committed to GitHub — the live site will update in ~1–2 minutes."
              : j.persisted === "local"
                ? "Saved to the data file — visible on the site now."
                : "Applied.";
          setMsgs((prev) => [
            ...prev,
            { role: "bot", text: `✅ ${j.message}\n${where}${j.commitUrl ? `\n${j.commitUrl}` : ""}` },
          ]);
          void refreshSite();
        } else {
          setMsgs((prev) => [...prev, { role: "bot", text: `⚠️ ${j.error ?? "Could not apply the change."}` }]);
        }
      } finally {
        setBusy(false);
      }
    },
    [refreshSite],
  );

  // ------------------------------ login view --------------------------------
  if (authed === null) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6 pt-28 text-nebula-300">
        <p className="animate-pulse text-sm uppercase tracking-[0.3em]">Checking access…</p>
      </section>
    );
  }

  if (!authed) {
    return (
      <section className="flex min-h-[80vh] items-center justify-center px-6 pt-28">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={login}
          className="card-glass w-full max-w-sm rounded-3xl p-8"
        >
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-fuchsia-300">
            Private area
          </p>
          <h1 className="mt-2 font-name text-2xl font-bold italic text-white">Admin access</h1>
          <p className="mt-2 text-xs text-nebula-300/70">
            This section is not linked publicly. Enter your admin password to manage the CV and portfolio content.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="mt-6 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-nebula-300/40 focus:border-nebula-500 focus:outline-none"
          />
          {loginError && <p className="mt-3 text-xs text-rose-400">{loginError}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="btn-primary mt-5 w-full rounded-full py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
        </motion.form>
      </section>
    );
  }

  // ------------------------------ chat view ---------------------------------
  return (
    <section className="mx-auto max-w-3xl px-5 pb-28 pt-28">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-fuchsia-300">
            Private assistant
          </p>
          <h1 className="mt-1 font-name text-2xl font-bold italic text-white">
            CV &amp; Portfolio Manager
          </h1>
        </div>
        <button
          onClick={logout}
          className="btn-ghost rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
        >
          Log out
        </button>
      </div>

      <div className="mt-6 flex flex-col overflow-hidden rounded-3xl border border-white/12 bg-space-900/60 backdrop-blur-xl">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm" style={{ maxHeight: "58vh" }}>
          {msgs.map((m, i) =>
            m.role === "confirm" ? (
              <div key={i} className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-emerald-200">{m.text}</p>
                <ul className="mt-2 space-y-1.5">
                  {m.preview.map((line, li) => (
                    <li key={li} className="rounded-lg bg-white/5 px-3 py-1.5 text-nebula-300">
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => confirm(m, i)}
                    disabled={busy}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
                  >
                    ✓ Confirm &amp; publish
                  </button>
                  <button
                    onClick={() => setMsgs((prev) => prev.filter((_, x) => x !== i))}
                    className="rounded-full border border-white/20 px-5 py-2 text-xs font-bold uppercase tracking-wider text-nebula-300 transition-colors hover:border-rose-400 hover:text-rose-300"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 ${
                    m.role === "user"
                      ? "rounded-br-md bg-nebula-600/70 text-white"
                      : "rounded-bl-md border border-white/10 bg-white/5 text-nebula-300"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-nebula-300">
                <span className="animate-pulse">Working…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {pendingFile && (
          <div className="border-t border-white/10 px-5 py-2 text-xs text-emerald-300">
            📎 Ready to attach: {pendingFile.name}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void parse(input);
          }}
          className="flex items-center gap-3 border-t border-white/10 px-5 py-3.5"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="Attach certificate file"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-nebula-300 transition-colors hover:border-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-50"
          >
            📎
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the change… (e.g. Add certificate: …, issuer …, 2025, link …)"
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-nebula-300/50 focus:border-nebula-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nebula-600 text-white transition-colors hover:bg-nebula-500 disabled:opacity-50"
            aria-label="Send"
          >
            ➤
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-nebula-300/50">
        Changes apply to the website and the downloadable CV after you confirm. In production they are committed to
        GitHub, which redeploys the site automatically.
      </p>
    </section>
  );
}
