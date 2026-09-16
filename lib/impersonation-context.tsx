"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getImpersonationState, type ImpersonationState } from "@/lib/services/impersonation";

type Ctx = ImpersonationState & { loading: boolean; refresh: () => void };
const ImpersonationCtx = createContext<Ctx>({ impersonating: false, loading: true, refresh: () => {} });

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>({ impersonating: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    getImpersonationState().then((s) => { setState(s); setLoading(false); }).catch(() => { setState({ impersonating: false }); setLoading(false); });
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  return <ImpersonationCtx.Provider value={{ ...state, loading, refresh }}>{children}</ImpersonationCtx.Provider>;
}

export const useImpersonation = () => useContext(ImpersonationCtx);
