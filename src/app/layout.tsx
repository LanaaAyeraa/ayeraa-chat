import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HavenChat — Intimate & Frictionless Real-time Rooms",
  description: "A warm, distraction-free web room chat powered by Next.js and Vercel serverless architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-warm-sand text-warm-text-ink antialiased selection:bg-warm-terracotta/20 selection:text-warm-terracotta">
        {children}
      </body>
    </html>
  );
}
