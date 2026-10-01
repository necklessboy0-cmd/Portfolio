"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ResumeData } from "@/data/resume";
import { resumeData as staticData } from "@/data/resume";

// ----------------------------------------------------------------------------
// Live data context — the whole site renders from /api/resume so confirmed
// admin edits appear immediately (and after every redeploy).
// ----------------------------------------------------------------------------

type Ctx = {
  data: ResumeData;
  refresh: () => Promise<void>;
};

const ResumeContext = createContext<Ctx>({ data: staticData, refresh: async () => {} });

export function useResume(): ResumeData {
  return useContext(ResumeContext).data;
}

export function useResumeRefresh(): () => Promise<void> {
  return useContext(ResumeContext).refresh;
}

export default function ResumeProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ResumeData>(staticData);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/resume", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as ResumeData;
        setData(json);
      }
    } catch {
      // keep last known data
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ data, refresh }), [data, refresh]);

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}
