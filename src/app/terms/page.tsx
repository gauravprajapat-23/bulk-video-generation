import Link from "next/link";
import { Film } from "lucide-react";

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-extrabold">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#8b95a5]">Last updated: June 27, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#c0c8d4]">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Video Maker (&quot;the Service&quot;), you agree to be bound by
              these Terms of Service. If you do not agree to these terms, please do not use the
              Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Video Maker is a web-based application that enables users to create short-form video
              content from images, audio, and text. The Service provides features for bulk video
              generation, YouTube integration for uploading and scheduling videos, and server-side
              automation for scheduled publishing.
            </p>
          </Section>

          <Section title="3. Account Registration">
            <p>
              To use certain features, you must connect your Google account via OAuth 2.0
              authentication. You are responsible for maintaining the security of your account and for
              all activities that occur under your account.
            </p>
          </Section>

          <Section title="4. YouTube Integration">
            <h3 className="mb-2 font-semibold text-[#e7ecf2]">Your Responsibilities</h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                You must comply with the{" "}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7c5cfc] underline hover:text-[#a78bfa]"
                >
                  YouTube Terms of Service
                </a>{" "}
                when using our YouTube integration.
              </li>
              <li>
                You are solely responsible for the content you upload to YouTube through our Service.
              </li>
              <li>
                You must not use the Service to upload content that violates YouTube&apos;s Community
                Guidelines, copyright laws, or any applicable regulations.
              </li>
              <li>
                You may disconnect your YouTube account at any time from the YouTube Connection page.
              </li>
            </ul>

            <h3 className="mb-2 mt-4 font-semibold text-[#e7ecf2]">Upload Limitations</h3>
            <p>
              YouTube API projects have a default quota limit. Our Service may impose additional
              daily upload limits based on your usage tier. Videos uploaded through the API while the
              project is unverified may be restricted to private visibility by YouTube.
            </p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5 mt-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>
                Upload content that is harmful, threatening, harassing, defamatory, or otherwise
                objectionable.
              </li>
              <li>
                Attempt to gain unauthorized access to the Service, other accounts, or any related
                systems or networks.
              </li>
              <li>
                Use the Service to distribute spam, malware, or any other harmful content.
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any part of the Service.
              </li>
              <li>
                Use automated scripts or bots to interact with the Service unless explicitly authorized.
              </li>
              <li>
                Resell or redistribute the Service without written permission.
              </li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              The Service and its original content, features, and functionality are owned by Video
              Maker and are protected by copyright, trademark, and other intellectual property laws.
              You retain ownership of the content you create using the Service.
            </p>
          </Section>

          <Section title="7. Content Ownership">
            <p>
              You retain full ownership of all images, audio, text, and video content you create or
              upload through the Service. We do not claim any ownership over your content. Your
              project files are stored locally in your browser and are not accessible to us unless you
              explicitly use server-side features.
            </p>
          </Section>

          <Section title="8. Service Availability">
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access to the
              Service. We may temporarily suspend or restrict access for maintenance, updates, or
              circumstances beyond our control.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Video Maker shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of
              profits or revenues, whether incurred directly or indirectly, or any loss of data, use,
              goodwill, or other intangible losses resulting from:
            </p>
            <ul className="list-disc space-y-2 pl-5 mt-2">
              <li>Your use of or inability to use the Service.</li>
              <li>Any unauthorized access to or alteration of your data.</li>
              <li>Any content obtained from the Service.</li>
              <li>Unauthorized third-party access to your accounts.</li>
            </ul>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
              of any kind, whether express or implied, including but not limited to implied warranties
              of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              We may terminate or suspend your access to the Service immediately, without prior
              notice, for conduct that we determine, in our sole discretion, violates these Terms or
              is harmful to other users, us, or third parties, or for any other reason.
            </p>
            <p className="mt-3">
              You may terminate your use of the Service at any time by disconnecting your YouTube
              account and ceasing to use the application.
            </p>
          </Section>

          <Section title="12. Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of any
              significant changes by posting the new terms on this page and updating the &quot;Last
              updated&quot; date. Your continued use of the Service after any changes constitutes
              acceptance of the new Terms.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws,
              without regard to its conflict of law provisions.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>
              If you have any questions about these Terms, please contact us at:
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
