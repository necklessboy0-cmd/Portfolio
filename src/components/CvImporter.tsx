"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { parseCvText, mergeParsed, type ParsedCv } from "@/lib/docxCvParser";
import { generateResumeFile } from "@/lib/generateResumeFile";
import { DownloadIcon, RocketIcon, SparklesIcon } from "./icons";

type Status = "idle" | "parsing" | "done" | "error";

export default function CvImporter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedCv | null>(null);
  const [merged, setMerged] = useState<ReturnType<typeof mergeParsed> | null>(null);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const handleText = useCallback(async (name: string, text: string) => {
    setFileName(name);
    setStatus("parsing");
    // let the UI show the parsing state
    await new Promise((r) => setTimeout(r, 60));
    try {
      const detected = parseCvText(text);
      const m = mergeParsed(detected);
      setParsed(detected);
      setMerged(m);
      setGenerated(generateResumeFile(m));
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (/\.docx$/i.test(file.name)) {
        try {
          const mammoth = await import("mammoth");
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          await handleText(file.name, result.value);
        } catch (err) {
          console.error(err);
          setFileName(file.name);
          setStatus("error");
        }
      } else if (/\.txt$/i.test(file.name)) {
        await handleText(file.name, await file.text());
      } else {
        setStatus("error");
      }
    },
    [handleText],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      window.prompt("Copy the generated file", generated);
    }
  };

  const download = () => {
    const blob = new Blob([generated], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.ts";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setParsed(null);
    setMerged(null);
    setGenerated("");
    setFileName("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* dropzone */}
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: status === "idle" ? 1.01 : 1 }}
        className={`card-glass cursor-pointer select-none rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-fuchsia-400/80 bg-fuchsia-500/10" : "border-nebula-400/30"
        }`}
        style={{ borderStyle: "dashed" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-nebula-600 to-fuchsia-500 text-white shadow-[0_10px_40px_-8px_rgba(168,85,247,0.7)]"
        >
          <RocketIcon size={36} />
        </motion.div>
        <p className="mt-6 font-name text-2xl font-bold italic text-white">
          {fileName || "Drag your CV here"}
        </p>
        <p className="mt-2 text-sm text-nebula-300/80">
          or click to choose — supports <strong>.docx</strong> (Word) and{" "}
          <strong>.txt</strong>. It is parsed in your browser, nothing is uploaded.
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-nebula-300/80">
          <SparklesIcon size={14} className="text-fuchsia-300" />
          {status === "parsing"
            ? "Reading your document…"
            : status === "error"
              ? "Could not read that file — use a .docx or .txt"
              : "Word document import tool"}
        </p>
      </motion.div>

      {/* result */}
      {status === "done" && merged && (
        <div className="mt-8 space-y-6">
          <div className="card-glass rounded-3xl p-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.3em] text-fuchsia-300">
              What was detected
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Name" value={merged.personal.shortName} />
              <Info label="Role" value={merged.personal.role} />
              <Info label="Email" value={merged.personal.email} />
              <Info label="Phone" value={merged.personal.phone} />
              <Info label="Location" value={merged.personal.location} />
              <Info label="LinkedIn" value={merged.personal.linkedin} />
              <Info label="GitHub" value={merged.personal.github} />
              <Info label="Instagram" value={merged.personal.instagram} />
              <Info label="Skills" value={`${merged.skills.length} detected`} />
              <Info label="Education" value={`${merged.education.length} entries`} />
              <Info label="Projects" value={`${merged.projects.length} detected`} />
              <Info label="Certificates" value={`${merged.certificates.length} detected`} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={copy}
              className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white"
            >
              {copied ? "✓ Copied!" : "Copy resume.ts"}
            </button>
            <button
              onClick={download}
              className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white"
            >
              <DownloadIcon size={16} className="text-fuchsia-300" />
              Download resume.ts
            </button>
            <button
              onClick={reset}
              className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white"
            >
              Import another file
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0d0719] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.3em] text-nebula-300">
                Generated code — next steps
              </h3>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-nebula-300/80">
              <li>
                Open <code className="text-fuchsia-300">src/data/resume.ts</code>
              </li>
              <li>
                Replace the 5 <code className="text-fuchsia-300">export const</code>{" "}
                blocks with the generated ones below
              </li>
              <li>
                Save — the site, the CV and the chatbot all update instantly
              </li>
            </ol>
            <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-space-950 p-4 text-[12px] leading-relaxed text-nebula-300">
              <code>{generated}</code>
            </pre>
          </div>
        </div>
      )}

      {parsed && parsed.unparsed.length > 0 && (
        <p className="mt-6 text-center text-xs text-nebula-300/50">
          Note: {parsed.unparsed.length} block(s) could not be mapped to a
          section — check the generated file and adjust manually if needed.
        </p>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-fuchsia-300">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-nebula-300">
        {value || "—"}
      </p>
    </div>
  );
}