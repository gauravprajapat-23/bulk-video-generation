"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { autoLoginWithGoogle, getBackendToken } from "@/lib/backendClient";
import { useAppStore } from "@/store/useAppStore";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setBackendAuth = useAppStore((s) => s.setBackendAuth);

  useEffect(() => {
    const token = getBackendToken();
    if (token) {
      router.push("/dashboard");
      return;
    }

    const googleToken = searchParams.get("token");
    if (googleToken) {
      setLoading(true);
      autoLoginWithGoogle(googleToken)
        .then((result) => {
          setBackendAuth({
            connected: true,
            token: result.token,
            userId: result.userId,
            email: result.email,
          });
          router.push("/dashboard");
        })
        .catch((err) => {
          setError(err.message || "Login failed");
          setLoading(false);
        });
    }
  }, [searchParams, router, setBackendAuth]);

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/login`;
    const scope = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");
    
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=select_account`;
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#080A0F]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Signing in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#080A0F]">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-border/50 bg-panel p-8 shadow-lg">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-semibold text-text">Video Maker</h1>
          <p className="text-sm text-muted">Sign in to access your projects</p>
        </div>
        
        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center gap-3 rounded-lg border border-border bg-panel2 px-6 py-3 text-sm font-medium text-text transition-colors hover:bg-panel2/80"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
        
        <p className="text-xs text-muted/60">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-[#080A0F]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
