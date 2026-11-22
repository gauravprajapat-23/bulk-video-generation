"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Download, Video, ArrowRight } from "lucide-react";
import { autoLoginWithGoogle, getBackendToken } from "@/lib/backendClient";
import { requestGoogleIdentityAccessToken } from "@/lib/youtubeClient";
import { useAppStore } from "@/store/useAppStore";

export default function LoginPage() {
  const router = useRouter();
  const setBackendAuth = useAppStore((s) => s.setBackendAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (getBackendToken()) router.replace("/dashboard");
  }, [router]);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      const googleAccessToken = await requestGoogleIdentityAccessToken();
      const result = await autoLoginWithGoogle(googleAccessToken);
      setBackendAuth({
        connected: true,
        token: result.token,
        userId: result.userId,
        email: result.email,
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#080A0F] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Film size={24} />
        </div>
        <h1 className="mt-4 text-center font-sora text-2xl font-bold text-text">Make videos your way</h1>
        <p className="mt-2 text-center text-sm text-muted">
          No account needed to create, render, preview or download videos.
        </p>

        <Link
          href="/create"
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Video size={17} /> Continue as guest <ArrowRight size={16} />
        </Link>
        <p className="mt-2 text-center text-xs text-muted">
          Guest projects and rendered files are stored in this browser. Clearing site data may delete them.
        </p>

        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          OR
          <span className="h-px flex-1 bg-border" />
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading || !googleConfigured}
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-panel2 px-4 py-3 text-sm font-semibold text-text hover:bg-border/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" /> : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
        {!googleConfigured && (
          <p className="mt-2 text-center text-xs text-muted">
            Google sign-in is not configured yet. Guest video creation is available.
          </p>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-bg p-3 text-xs text-muted">
          <Download size={15} className="mt-0.5 shrink-0 text-accent" />
          <p>
            Signing in is optional. Connecting a YouTube channel to upload or schedule videos
            is a separate step that requests Google permission only when needed.
          </p>
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          <Link href="/" className="text-accent hover:underline">Back to home</Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </p>
      </div>
    </div>
  );
}
