"use client";

import { useState } from "react";
import { DownloadIcon } from "./icons";

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
  const [busy, setBusy] = useState<"pdf" | "txt" | null>(null);

  const downloadPdf = async () => {
    if (busy) return;
    const sheet = document.getElementById(sheetId);
    if (!sheet) return;
    setBusy("pdf");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const pageEls = Array.from(
        sheet.querySelectorAll(".cv-page"),
      ) as HTMLElement[];

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const img = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, 210, 297);
      }
      pdf.save("Muhammad-Taswaib-CV.pdf");
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setBusy(null);
    }
  };

  const downloadTxt = async () => {
    if (busy) return;
    setBusy("txt");
    try {
      const res = await fetch("/api/resume.txt");
      const text = await res.text();
      downloadBlob(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        "Muhammad-Taswaib-CV.txt",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-4">
      <button
        onClick={downloadPdf}
        disabled={busy !== null}
        className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60"
      >
        <DownloadIcon size={16} />
        {busy === "pdf" ? "Creating…" : "Download PDF"}
      </button>
      <button
        onClick={downloadTxt}
        disabled={busy !== null}
        className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60"
      >
        <DownloadIcon size={16} className="text-fuchsia-300" />
        {busy === "txt" ? "Preparing…" : "Download ATS .TXT"}
      </button>
      <button
        onClick={() => window.print()}
        className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}