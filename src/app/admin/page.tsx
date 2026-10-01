"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useResumeRefresh } from "@/components/ResumeProvider";

// ----------------------------------------------------------------------------
// Private admin panel — NOT linked anywhere on the public site.
//  • Login: administrator password only (no signup, no OAuth).
//  • Assistant tab: describe changes in plain language (preview → confirm →
//    apply) and upload certificates/degrees — the server ANALYZES the document
//    and proposes a structured, editable preview before anything is applied.
//  • Security tab: change the administrator password (invalidates sessions).
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

type DocAnalysis = {
  documentType: string;
  qualification: string;
  issuer: string | null;
  recipient: string | null;
  date: string | null;
  suggestedSection: string;
  suggestedHeading: string;
  suggestedDescription: string;
  suggestedSkills: string[];
  confidence: string;
  textPreview?: string;
};

type AnalysisDraft = {
  heading: string;
  description: string;
  skillsText: string;
  year: string;
  apply: boolean;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"assistant" | "security">("assistant");

  // login state
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  // assistant state
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text:
        "Private assistant ready. You can:\n\n" +
        "• 📎 Attach a certificate/degree — I'll read it, extract the details, and propose the CV + website update for your confirmation\n" +
        "• “Add certificate: Deep Learning, issuer Coursera, 2025, link https://…, skills: Python, AI”\n" +
        "• “Add course: Financial Modeling, issuer CFI”\n" +
        "• “Add project: My App, link https://…, tech: Next.js, AI”\n" +
        "• “Add skills: SQL, Power BI”\n" +
        "• “Update email: me@example.com”",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; analysis?: DocAnalysis } | null>(null);
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const refreshSite = useResumeRefresh();

  // security state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [vercelHash, setVercelHash] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
        setPassword("");
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setLoginError(j.error ?? "Login failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    setAuthed(false);
    setTab("assistant");
  };

  const uploadFile = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch("/api/admin/analyze", { method: "POST", body: form });
      const j = (await res.json()) as {
        ok: boolean;
        file?: { name: string; url: string };
        analysis?: DocAnalysis | null;
        error?: string;
      };
      if (res.ok && j.file) {
        setPendingFile({ url: j.file.url, name: j.file.name, analysis: j.analysis ?? undefined });
        if (j.analysis) {
          setAnalysisDraft({
            heading: j.analysis.suggestedHeading,
            description: j.analysis.suggestedDescription,
            skillsText: j.analysis.suggestedSkills.join(", "),
            year: j.analysis.date ?? "",
            apply: false,
          });
          setMsgs((prev) => [
            ...prev,
            { role: "bot", text: `📎 ${j.file!.name}\nI read the document — here's my analysis. Review, edit if needed, then confirm to add it to the CV and website.` },
          ]);
        } else {
          setMsgs((prev) => [
            ...prev,
            { role: "bot", text: `📎 Uploaded: ${j.file!.name}\n${j.error ?? "I couldn't read enough text from it. Describe the entry instead — e.g. “Add certificate: <name>, issuer <org>, 2025” — and I'll attach this file as its clickable link."}` },
          ]);
        }
      } else {
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
          const withFile = pendingFile ? [...j.preview, `Attached file → ${pendingFile.url}`] : j.preview;
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

  /** Apply the analyzed document as a certificate entry (editable fields). */
  const applyAnalysis = useCallback(async () => {
    if (!pendingFile?.analysis || !analysisDraft || busy) return;
    setBusy(true);
    try {
      const a = pendingFile.analysis;
      const message = [
        "Add certificate:",
        analysisDraft.heading,
        a.issuer ? `issuer ${a.issuer}` : "",
        analysisDraft.year ? `year ${analysisDraft.year}` : "",
        `link ${pendingFile.url}`,
        analysisDraft.skillsText ? `skills: ${analysisDraft.skillsText}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      const res = await fetch("/api/admin/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", message }),
      });
      const j = (await res.json()) as
        | { ok: true; ops: unknown; preview: string[] }
        | { ok: false; help: string };
      if (j.ok) {
        setAnalysisDraft((d) => (d ? { ...d, apply: true } : d));
        setMsgs((prev) => [
          ...prev,
          {
            role: "confirm",
            text: "Ready to add — confirm to apply to the CV and website:",
            preview: j.preview,
            ops: j.ops,
          },
        ]);
      } else {
        setMsgs((prev) => [...prev, { role: "bot", text: `🤔 ${j.help}` }]);
      }
    } finally {
      setBusy(false);
    }
  }, [pendingFile, analysisDraft, busy]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setPwMsg(null);
    if (newPw !== newPw2) {
      setPwMsg({ kind: "err", text: "New passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        persistent?: boolean;
        message?: string;
        hashForVercel?: string;
        error?: string;
      };
      if (res.ok && j.ok) {
        if (j.persistent) {
          setPwMsg({ kind: "ok", text: j.message ?? "Password updated." });
        } else {
          setVercelHash(j.hashForVercel ?? null);
          setPwMsg({ kind: "ok", text: j.message ?? "Password accepted for this session." });
        }
        setCurrentPw("");
        setNewPw("");
        setNewPw2("");
      } else {
        setPwMsg({ kind: "err", text: j.error ?? "Could not change the password." });
      }
    } finally {
      setBusy(false);
    }
  };

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
            This section is not linked publicly. Enter the administrator password to manage the CV and portfolio.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="mt-6 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-nebula-300/40 focus:border-nebula-500 focus:outline-none"
          />
          {loginError && <p className="mt-3 text-xs text-red-300">{loginError}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="btn-primary mt-4 w-full rounded-full py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Unlock"}
          </button>
          <p className="mt-4 text-center text-[11px] text-nebula-300/50">
            No public registration. Access is password-controlled by the owner.
          </p>
        </motion.form>
      </section>
    );
  }

  // ------------------------------ panel view --------------------------------
  return (
    <section className="mx-auto min-h-screen w-full max-w-5xl px-6 pb-24 pt-28">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-fuchsia-300">
            Private area
          </p>
          <h1 className="mt-1 font-name text-3xl font-bold italic text-white">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("assistant")}
            className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition ${
              tab === "assistant" ? "btn-primary text-white" : "btn-ghost text-white"
            }`}
          >
            Assistant
          </button>
          <button
            onClick={() => setTab("security")}
            className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition ${
              tab === "security" ? "btn-primary text-white" : "btn-ghost text-white"
            }`}
          >
            Security
          </button>
          <button onClick={logout} className="btn-ghost rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-white">
            Logout
          </button>
        </div>
      </div>

      {tab === "assistant" && (
        <div className="card-glass flex h-[62vh] flex-col rounded-3xl p-5">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-fuchsia-500/20 text-white"
                      : "bg-white/5 text-nebula-100"
                  }`}
                >
                  {m.text}
                  {"preview" in m && m.preview && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-left text-xs opacity-90">
                      {m.preview.map((line, k) => (
                        <li key={k}>{String(line)}</li>
                      ))}
                    </ul>
                  )}
                  {"ops" in m && m.ops ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => confirm(m, i)}
                        disabled={busy}
                        className="rounded-full bg-emerald-500/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                      >
                        Confirm & apply
                      </button>
                      <button
                        onClick={() => setMsgs((prev) => prev.filter((_, idx) => idx !== i))}
                        className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white/80"
                      >
                        Discard
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {pendingFile?.analysis && analysisDraft && !analysisDraft.apply && (
              <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/5 p-4 text-sm text-white">
                <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-300">
                  Document analysis — review before applying
                </p>
                <dl className="mb-4 space-y-1.5 text-xs text-nebula-100">
                  <div className="flex gap-2"><dt className="w-40 shrink-0 opacity-60">Document</dt><dd><a href={pendingFile.url} target="_blank" rel="noreferrer" className="underline">{pendingFile.name}</a></dd></div>
                  <div className="flex gap-2"><dt className="w-40 shrink-0 opacity-60">Detected type</dt><dd>{pendingFile.analysis.documentType}</dd></div>
                  <div className="flex gap-2"><dt className="w-40 shrink-0 opacity-60">Qualification</dt><dd>{pendingFile.analysis.qualification}</dd></div>
                  {pendingFile.analysis.issuer && (
                    <div className="flex gap-2"><dt className="w-40 shrink-0 opacity-60">Issued by</dt><dd>{pendingFile.analysis.issuer}</dd></div>
                  )}
                  {pendingFile.analysis.recipient && (
                    <div className="flex gap-2"><dt className="w-40 shrink-0 opacity-60">Recipient</dt><dd>{pendingFile.analysis.recipient}</dd></div>
                  )}
                  {pendingFile.analysis.date && (
                    <div className="flex gap-2"><dt className="w-40 shrink-0 opacity-60">Date</dt><dd>{pendingFile.analysis.date}</dd></div>
                  )}
                  <div className="flex gap-2"><dt className="w-40 shrink-0 opacity-60">Confidence</dt><dd className="uppercase">{pendingFile.analysis.confidence}</dd></div>
                </dl>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider opacity-70">CV heading</label>
                <input
                  value={analysisDraft.heading}
                  onChange={(e) => setAnalysisDraft({ ...analysisDraft, heading: e.target.value })}
                  className="mb-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                />
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider opacity-70">Description</label>
                <textarea
                  value={analysisDraft.description}
                  onChange={(e) => setAnalysisDraft({ ...analysisDraft, description: e.target.value })}
                  rows={2}
                  className="mb-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                />
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider opacity-70">Skills (comma-separated, only if justified)</label>
                <input
                  value={analysisDraft.skillsText}
                  onChange={(e) => setAnalysisDraft({ ...analysisDraft, skillsText: e.target.value })}
                  className="mb-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                />
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider opacity-70">Year</label>
                <input
                  value={analysisDraft.year}
                  onChange={(e) => setAnalysisDraft({ ...analysisDraft, year: e.target.value })}
                  className="mb-4 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                />
                <button
                  onClick={applyAnalysis}
                  disabled={busy}
                  className="btn-primary rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                >
                  {busy ? "Preparing…" : "Use this analysis →"}
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              parse(input);
            }}
            className="mt-4 flex items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach a certificate or document"
              className="btn-ghost rounded-full px-4 py-2.5 text-lg text-white"
            >
              📎
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the change, or attach a document…"
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white placeholder:text-nebula-300/40 focus:border-nebula-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {tab === "security" && (
        <div className="card-glass mx-auto max-w-xl rounded-3xl p-8">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-fuchsia-300">
            Security
          </p>
          <h2 className="mt-2 font-name text-xl font-bold italic text-white">Change administrator password</h2>
          <p className="mt-2 text-xs text-nebula-300/70">
            Changing the password immediately invalidates every existing session (including this one on other devices).
          </p>
          <form onSubmit={changePassword} className="mt-6 space-y-4">
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-nebula-300/40 focus:border-nebula-500 focus:outline-none"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (min 10 chars, letters + numbers)"
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-nebula-300/40 focus:border-nebula-500 focus:outline-none"
            />
            <input
              type="password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-nebula-300/40 focus:border-nebula-500 focus:outline-none"
            />
            {pwMsg && (
              <p className={`rounded-lg px-3 py-2 text-xs ${pwMsg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                {pwMsg.text}
              </p>
            )}
            {vercelHash && (
              <div className="rounded-lg border border-white/15 bg-black/40 p-3">
                <p className="mb-2 text-[11px] opacity-70">
                  Production is read-only: paste this hash into Vercel → Settings → Environment Variables →
                  <code className="mx-1">ADMIN_PASSWORD_HASH</code> and redeploy. It reveals nothing about your password.
                </p>
                <code className="block break-all text-[10px] text-nebula-100">{vercelHash}</code>
              </div>
            )}
            <button
              type="submit"
              disabled={busy || !currentPw || !newPw}
              className="btn-primary w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
