import { buildCvText } from "@/lib/cv";

export async function GET() {
  const text = buildCvText();
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=Muhammad-Taswaib-CV.txt",
      "Cache-Control": "no-store",
    },
  });
}