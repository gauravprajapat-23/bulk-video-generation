"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Youtube,
  ShieldCheck,
  Link2Off,
  AlertTriangle,
  RefreshCcw,
  Repeat2,
  Check,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useToast } from "@/components/ui/Toast";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Badge } from "@/components/ui/Badge";
import {
  clearYouTubeAccessToken,
  fetchMyYouTubeChannel,
  hasYouTubeClientId,
  requestYouTubeAccessToken,
  revokeYouTubeAccessToken,
} from "@/lib/youtubeClient";
import {
  autoLoginWithGoogle,
  getBackendToken,
  setBackendToken,
} from "@/lib/backendClient";

type ConnectMode = "consent" | "select_account" | "silent";

export default function YouTubeConnectionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <YouTubeConnectionContent />
    </Suspense>
  );
}

function YouTubeConnectionContent() {
  const hasHydrated = useHasHydrated();
  const searchParams = useSearchParams();
  const youtube = useAppStore((s) => s.youtube);
  const setYoutubeAccount = useAppStore((s) => s.setYoutubeAccount);
  const disconnectYoutube = useAppStore((s) => s.disconnectYoutube);
  const setBackendAuth = useAppStore((s) => s.setBackendAuth);
  const { show } = useToast();

  const [connectingMode, setConnectingMode] = useState<ConnectMode | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const channelId = searchParams.get("channelId");
    const error = searchParams.get("error");

    if (token) {
      setBackendToken(token);
      const stored = localStorage.getItem("video-maker-store");
      let userId = "anonymous";
      let email = "user@local.app";
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          userId = parsed.state?.youtube?.channelId || userId;
          email = `${userId}@local.app`;
        } catch {}
      }
      setBackendAuth({ connected: true, token, userId, email });
      show("Backend connected with YouTube channel.", "success");
      window.history.replaceState({}, "", "/youtube");
    }
    if (error) {
      show(`Backend OAuth failed: ${error}`, "error");
      window.history.replaceState({}, "", "/youtube");
    }
  }, [searchParams, setBackendAuth, show]);

  if (!hasHydrated) return <p className="text-sm text-muted">Loading…</p>;

  async function connect(mode: ConnectMode = "consent") {
    setConnectingMode(mode);
    try {
      const token = await requestYouTubeAccessToken(mode === "silent" ? "" : mode);
      const account = await fetchMyYouTubeChannel(token);
      setYoutubeAccount(account);

      if (!getBackendToken()) {
        try {
          const backendResult = await autoLoginWithGoogle(token);
          setBackendAuth({ connected: true, token: backendResult.token, userId: backendResult.userId, email: backendResult.email });
        } catch {
          // Backend may not be running — continue with YouTube-only connection
        }
      }

      show(`Connected to ${account.channelTitle}.`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Couldn't connect YouTube.", "error");
    } finally {
      setConnectingMode(null);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await revokeYouTubeAccessToken();
      disconnectYoutube();
      show("Channel disconnected from this browser.", "success");
    } catch {
      clearYouTubeAccessToken();
      disconnectYoutube();
      show("Local YouTube session removed.", "success");
    } finally {
      setDisconnecting(false);
      setConfirmOpen(false);
    }
  }

  const clientConfigured = hasYouTubeClientId();

  return (
    <div className="space-y-5 max-w-3xl">
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bad/15 text-bad">
            <Youtube size={20} />
          </div>
          <div>
            <CardTitle>YouTube Channel</CardTitle>
            <CardSubtitle>
              Each user connects their own Google/YouTube channel from the frontend. Your app uses one
              public Google OAuth Client ID, but every creator receives a separate browser OAuth token
              for their own uploads and scheduled publishes.
            </CardSubtitle>
          </div>
        </div>

        {!clientConfigured ? (
          <div className="mt-4 rounded-lg border border-accent2/40 bg-accent2/10 px-3 py-3 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-accent2" />
            <div className="text-[11px] text-muted leading-relaxed">
              <p className="font-semibold text-text">Google OAuth client is not configured.</p>
              <p>
                Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to <code>.env.local</code>, restart
                Next.js, and allow your local/production domain in the Google OAuth Web client.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 flex items-start gap-2">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-[11px] text-muted leading-relaxed">
              Frontend-only OAuth is enabled. The user signs in on Google, grants YouTube permission,
              and this browser receives a short-lived access token. No shared channel password, client
              secret, or global upload account is stored in the app.
            </p>
          </div>
        )}

        <div className="mt-5">
          {!youtube.connected ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => connect("consent")}
              loading={connectingMode === "consent"}
              disabled={!clientConfigured || Boolean(connectingMode)}
            >
              <Youtube size={16} /> Connect my YouTube Channel
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-panel2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {youtube.channelThumbnailUrl && (
                    <img src={youtube.channelThumbnailUrl} alt="" className="h-11 w-11 rounded-full border border-border" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text">{youtube.channelTitle}</p>
                    <p className="truncate text-[10.5px] text-muted">Channel ID: {youtube.channelId}</p>
                    {youtube.connectedAt && <p className="text-[10.5px] text-muted">Connected in this browser</p>}
                  </div>
                </div>
                <Badge tone="ok">Connected</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => connect("select_account")}
                  loading={connectingMode === "select_account"}
                  disabled={!clientConfigured || Boolean(connectingMode)}
                >
                  <Repeat2 size={14} /> Switch channel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => connect("consent")}
                  loading={connectingMode === "consent"}
                  disabled={!clientConfigured || Boolean(connectingMode)}
                >
                  <RefreshCcw size={14} /> Refresh permission
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
                  <Link2Off size={14} /> Disconnect
                </Button>
              </div>

              {getBackendToken() ? (
                <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-accent">
                  <Check size={11} /> Backend connected automatically
                </div>
              ) : (
                <div className="mt-2 text-[10.5px] text-muted">
                  Backend will connect automatically when available.
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title="Disconnect this channel?"
        description="This removes the connected channel from this browser. Other users and other browsers are not affected. Already uploaded scheduled videos remain on YouTube."
        confirmLabel="Disconnect"
        loading={disconnecting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
