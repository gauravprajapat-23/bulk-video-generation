import Link from "next/link";
import { Film, Youtube, Shield, CalendarClock, Download, Layers } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0d11] text-[#e7ecf2]">
      <header className="border-b border-[#1c2030]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#a78bfa]">
              <Film size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Video Maker</p>
              <p className="text-[10.5px] leading-none text-[#8b95a5] mt-0.5">Shorts Studio</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#7c5cfc] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6a4be0] transition-colors"
          >
            Start Creating
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="font-sora text-4xl font-extrabold leading-tight sm:text-5xl">
          Create &amp; Schedule
          <br />
          <span className="text-[#7c5cfc]">YouTube Shorts</span> at Scale
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[#8b95a5]">
          Create, render, preview and download videos without an account. Connect YouTube later
          only if you want to upload videos or use server-side scheduling.
        </p>
        <p className="mt-3 text-sm text-[#a78bfa]">No signup · No credit card · Download your videos</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#7c5cfc] px-6 py-3 text-sm font-bold text-white hover:bg-[#6a4be0] transition-colors"
          >
            Create Videos — No Signup
          </Link>
          <Link
            href="/privacy"
            className="rounded-lg border border-[#262b34] px-6 py-3 text-sm font-semibold text-[#8b95a5] hover:bg-[#14171f] transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Layers size={20} />}
            title="Bulk Video Generation"
            description="Turn image collections into polished short-form videos with transitions, text overlays, and watermarks."
          />
          <FeatureCard
            icon={<Youtube size={20} />}
            title="YouTube Integration"
            description="Connect your Google account to upload and schedule videos directly to your YouTube channel."
          />
          <FeatureCard
            icon={<CalendarClock size={20} />}
            title="Server-Side Scheduling"
            description="Schedule uploads for specific times. The backend cron job handles publishing even when your browser is closed."
          />
          <FeatureCard
            icon={<Download size={20} />}
            title="Download &amp; Manual Upload"
            description="Download rendered videos anytime. Upload manually to any platform if you prefer not to use API integration."
          />
          <FeatureCard
            icon={<Shield size={20} />}
            title="Secure OAuth"
            description="Google sign-in is optional for local creation. Connecting a YouTube channel separately grants upload permissions when you choose to use them."
          />
          <FeatureCard
            icon={<Film size={20} />}
            title="Multiple Formats"
            description="Export as YouTube Shorts, Instagram Reels, TikTok, or custom dimensions. One project, many platforms."
          />
        </div>
      </section>

      <section className="border-t border-[#1c2030] mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-xl font-bold">YouTube Data API Integration</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#8b95a5]">
          Video Maker uses the YouTube Data API v3 to upload and manage videos on your behalf. You can
          disconnect your YouTube account at any time from the YouTube Connection page. We only request
          the permissions needed to upload and view your own channel information.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#8b95a5]">
          <span className="rounded-lg border border-[#262b34] px-3 py-1.5">youtube.upload</span>
          <span className="rounded-lg border border-[#262b34] px-3 py-1.5">youtube.readonly</span>
        </div>
      </section>

      <footer className="border-t border-[#1c2030]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-[#8b95a5]">
          <p>&copy; {new Date().getFullYear()} Video Maker. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-[#1c2030] bg-[#14171f] p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#7c5cfc]/15 text-[#7c5cfc]">
        {icon}
      </div>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-[#8b95a5]">{description}</p>
    </div>
  );
}
