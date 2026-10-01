import { readResumeData } from "@/lib/resumeStore";
import { buildCvText } from "@/lib/cv";

export const runtime = "nodejs";

export async function GET() {
  const { data } = await readResumeData();
  const text = buildCvText(data);
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=Muhammad-Taswaib-CV.txt",
      "Cache-Control": "no-store",
    },
  });
}
