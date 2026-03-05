import { trpc } from "@/lib/trpc";
import {
  clearSessionIdToken,
  clearSignupRole,
  getGoogleTokenClaims,
  getSessionIdToken,
  getSignupRole,
  setSessionIdToken,
} from "@/lib/session";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const utils = trpc.useUtils();
  const silentAuthAttemptedRef = useRef(false);
  const [silentAuthRunning, setSilentAuthRunning] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      clearSessionIdToken();
      clearSignupRole();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const claims = getGoogleTokenClaims();
    const fallbackRole = getSignupRole();
    const fallbackUser =
      !meQuery.data && !meQuery.error && claims?.sub
        ? {
            id: 0,
            openId: `google:${claims.sub}`,
            name: claims.name ?? null,
            email: claims.email ?? null,
            role: (fallbackRole ?? "comprador") as "livreiro" | "comprador",
          }
        : null;
    const resolvedUser = meQuery.data ?? fallbackUser;

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(resolvedUser)
    );
    return {
      user: resolvedUser,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(resolvedUser),
      role: resolvedUser?.role ?? null,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.user) return;
    if (silentAuthAttemptedRef.current) return;
    if (getSessionIdToken()) return;

    const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
    if (!googleClientId) return;

    const googleApi = (window as any).google?.accounts?.id;
    if (!googleApi) return;

    silentAuthAttemptedRef.current = true;
    setSilentAuthRunning(true);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setSilentAuthRunning(false);
    };

    googleApi.initialize({
      client_id: googleClientId,
      auto_select: true,
      callback: async (response: { credential?: string }) => {
        if (response?.credential) {
          setSessionIdToken(response.credential);
          await utils.auth.me.invalidate();
        }
        finish();
      },
    });

    googleApi.prompt((notification: any) => {
      const unavailable =
        notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.();
      if (unavailable) {
        finish();
      }
    });

    const timeoutId = window.setTimeout(finish, 3000);
    return () => {
      window.clearTimeout(timeoutId);
      finish();
    };
  }, [state.user, utils]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending || silentAuthRunning) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    silentAuthRunning,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
