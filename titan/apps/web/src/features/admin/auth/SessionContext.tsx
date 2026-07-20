import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "../../../lib/apiClient.js";
import { fetchMe, type MeResponse } from "./session.js";

export type SessionState =
  | { status: "loading" }
  | { status: "authenticated"; me: MeResponse }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

const SessionContext = createContext<SessionState | undefined>(undefined);

/**
 * Resolves "who is signed in" once per mount by calling `GET /api/me` — the
 * one call that carries both identity and role (`isPlatformAdministrator`),
 * which `GET /api/auth/session` deliberately doesn't (`auth/config.ts`'s
 * session callback keeps that payload minimal). A 401 is a real,
 * expected outcome (no session) and resolves to `"unauthenticated"`, not
 * `"error"` — only a request that couldn't complete at all, or failed for a
 * reason other than "you're not signed in", is `"error"`.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((me) => {
        if (!cancelled) setState({ status: "authenticated", me });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setState({ status: "unauthenticated" });
        } else {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not verify your session.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
