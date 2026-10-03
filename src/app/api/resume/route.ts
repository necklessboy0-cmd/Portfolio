import { NextResponse } from "next/server";
import { readResumeData } from "@/lib/resumeStore";

// GET /api/resume → current canonical data (site reads this at runtime).
export async function GET() {
  const { data, source } = await readResumeData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
