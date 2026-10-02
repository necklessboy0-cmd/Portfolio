"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ----------------------------------------------------------------------------
// CV downloads — ALL artifacts are served by protected server endpoints.
//  • /api/cv?format=pdf → real text-based PDF (selectable, ATS-parseable)
//  • /api/cv?format=txt → plain-text ATS version
// Every request carries the HttpOnly session cookie and is verified
// server-side; unauthenticated visitors are asked to log in first.
// ----------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CvDownload({ sheetId }: { sheetId: string }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<"pdf" | "txt" | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j: { authenticated: boolean }) => setAuthed(j.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  const gated = async (kind: "pdf" | "txt") => {
    if (busy) return;
    setBusy(kind);
    try {
      const res = await fetch(kind === "pdf" ? "/api/cv?format=pdf" : "/api/cv?format=txt");
      if (res.status === 401) {
        setAuthed(false);
        router.push("/login?next=/cv");
        return;
      }
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      downloadBlob(
        blob,
        kind === "pdf" ? "Muhammad-Taswaib-CV.pdf" : "Muhammad-Taswaib-CV.txt",
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const btnCls =
    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-60";

  if (authed === null) {
    return (
      <div className="no-print flex items-center justify-center gap-4 py-6">
        <span className="text-sm opacity-60">Checking access…</span>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="no-print mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="mb-1 text-sm font-bold uppercase tracking-wider">CV download is protected</p>
        <p className="mb-4 text-sm opacity-70">
          The CV is viewable here, but download requires authentication.
        </p>
        <a
          href="/login?next=/cv"
          className={`${btnCls} btn-primary text-white`}
        >
          Login to download CV
        </a>
      </div>
    );
  }

  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-4">
      <button
        onClick={() => gated("pdf")}
        disabled={busy !== null}
        className={`${btnCls} btn-primary text-white`}
      >
        {busy === "pdf" ? "Creating…" : "Download PDF"}
      </button>
      <button
        onClick={() => gated("txt")}
        disabled={busy !== null}
        className={`${btnCls} btn-ghost text-white`}
      >
        {busy === "txt" ? "Preparing…" : "Download ATS .TXT"}
      </button>
      <button
        onClick={() => window.print()}
        className={`${btnCls} btn-ghost text-white`}
      >
        Print / Save as PDF
      </button>
      <span id={sheetId} className="hidden" />
    </div>
  );
}
