import Link from "next/link";
import { Film } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0b0d11] text-[#e7ecf2]">
      <header className="border-b border-[#1c2030]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#a78bfa]">
              <Film size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Video Maker</p>
              <p className="text-[10.5px] leading-none text-[#8b95a5] mt-0.5">Shorts Studio</p>
            </div>
          </Link>
          <Link href="/" className="text-xs text-[#8b95a5] hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#8b95a5]">Last updated: June 27, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#c0c8d4]">
          <Section title="1. Introduction">
            <p>
              Video Maker (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a web-based video creation and scheduling tool.
              This Privacy Policy explains how we collect, use, and protect your information when you
              use our application and services.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <h3 className="mb-2 font-semibold text-[#e7ecf2]">Account Information</h3>
            <p>
              When you connect your Google/YouTube account, we receive your Google user ID, email
              address, display name, and profile picture from Google&apos;s OAuth service. This
              information is used solely to authenticate you and manage your YouTube integration.
            </p>

            <h3 className="mb-2 mt-4 font-semibold text-[#e7ecf2]">YouTube Data</h3>
            <p>
              With your explicit consent, we access your YouTube channel information (channel ID,
              title, thumbnail) and upload videos on your behalf. We do not access, modify, or delete
              any existing content on your YouTube channel without your direct action.
            </p>

            <h3 className="mb-2 mt-4 font-semibold text-[#e7ecf2]">Project Data</h3>
            <p>
              Images, audio files, and rendered videos you create are stored locally in your
              browser&apos;s IndexedDB. When you use server-side scheduling, video files are
              temporarily uploaded to our backend server for processing and are deleted after the
              scheduled upload is complete.
            </p>

            <h3 className="mb-2 mt-4 font-semibold text-[#e7ecf2]">Usage Data</h3>
            <p>
              We may collect anonymous usage analytics (page views, feature usage) to improve our
              service. This data does not identify you personally.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc space-y-2 pl-5">
              <li>To authenticate you via Google OAuth and manage your YouTube connection.</li>
              <li>To upload videos to your YouTube channel when you initiate an upload.</li>
              <li>To process and schedule video uploads via our server-side cron scheduler.</li>
              <li>To provide customer support when you contact us.</li>
              <li>To improve our application and user experience.</li>
            </ul>
          </Section>

          <Section title="4. YouTube API Services">
            <p>
              Our application uses the YouTube Data API v3. By using our YouTube integration, you
              also agree to be bound by the{" "}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7c5cfc] underline hover:text-[#a78bfa]"
              >
                YouTube Terms of Service
              </a>
              . Google&apos;s{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7c5cfc] underline hover:text-[#a78bfa]"
              >
                Privacy Policy
              </a>{" "}
              also applies to your use of YouTube data through our application.
            </p>
            <p className="mt-3">
              We request only the following YouTube OAuth scopes:
            </p>
            <ul className="list-disc space-y-1 pl-5 mt-2">
              <li><code>youtube.upload</code> — To upload videos to your channel on your behalf.</li>
              <li><code>youtube.readonly</code> — To view your channel name and thumbnail for display purposes.</li>
            </ul>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>
              Your YouTube OAuth refresh tokens are stored securely in our database and are used only
              to refresh access tokens for uploading videos on your behalf. We use industry-standard
              encryption for data at rest and in transit (HTTPS).
            </p>
            <p className="mt-3">
              Project files (images, audio, videos) are primarily stored in your browser&apos;s
              local storage (IndexedDB) and are not transmitted to our servers unless you explicitly
              use server-side scheduling features.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your account information and YouTube tokens for as long as your account is
              active. You may disconnect your YouTube account at any time, which will revoke our
              access token and delete stored refresh tokens. Server-side scheduled uploads are
              processed and then removed from our system.
            </p>
          </Section>

          <Section title="7. Third-Party Services">
            <p>We use the following third-party services:</p>
            <ul className="list-disc space-y-2 pl-5 mt-2">
              <li>
                <strong>Google OAuth 2.0</strong> — For authentication and YouTube API access.
              </li>
              <li>
                <strong>Neon PostgreSQL</strong> — For secure database hosting.
              </li>
            </ul>
            <p className="mt-3">
              Each third-party service has its own privacy policy. We encourage you to review them.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc space-y-2 pl-5 mt-2">
              <li>Disconnect your YouTube account at any time from the YouTube Connection page.</li>
              <li>Request deletion of your account data by contacting us.</li>
              <li>Access the data we hold about you.</li>
              <li>Export your project data from the application.</li>
            </ul>
          </Section>

          <Section title="9. Children&apos;s Privacy">
            <p>
              Our service is not intended for children under 13. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal
              information, please contact us immediately.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              significant changes by posting the new policy on this page and updating the &quot;Last
              updated&quot; date.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              <a
                href="mailto:support@videomaker.app"
                className="text-[#7c5cfc] underline hover:text-[#a78bfa]"
              >
                support@videomaker.app
              </a>
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-[#1c2030]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-[#8b95a5]">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
