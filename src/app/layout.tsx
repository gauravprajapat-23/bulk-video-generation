import type { Metadata } from "next";
import "./globals.css";
import { LayoutGuard } from "@/components/layout/LayoutGuard";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Video Maker — Shorts Studio",
  description: "Design bulk images from CSV data and turn them into YouTube Shorts, Reels, and TikTok videos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-inter antialiased">
        <ToastProvider>
          <LayoutGuard>{children}</LayoutGuard>
        </ToastProvider>
      </body>
    </html>
  );
}
