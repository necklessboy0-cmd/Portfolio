"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ----------------------------------------------------------------------------
// Password login — the ONLY authentication surface. No signup, no registration,
// no OAuth. Grants access to: the private admin panel (/admin) and CV
// downloads (/api/cv, /api/resume.txt).
// ----------------------------------------------------------------------------

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j: { authenticated: boolean }) => {
        if (j.authenticated) router.replace(next);
      })
      .catch(() => {});
  }, [router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(next);
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Login failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] opacity-60">Restricted</p>
        <h1 className="mb-2 font-display text-3xl font-bold">Admin Login</h1>
        <p className="mb-6 text-sm opacity-70">
          Enter the administrator password to manage the portfolio or download the CV.
          There is no public registration — access is granted by the owner only.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Administrator password"
              autoComplete="current-password"
              autoFocus
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 pr-16 text-sm outline-none focus:border-white/40"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider opacity-60 hover:opacity-100"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="btn-primary w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs opacity-50">
          Need access? Contact the site owner directly — there is no self-signup.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="underline opacity-60 hover:opacity-100">
            ← Back to portfolio
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
