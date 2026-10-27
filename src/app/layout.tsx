import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DmNotificationManager } from "@/components/notifications/DmNotificationManager";

export const metadata: Metadata = {
  title: "Ayera — Modern Real-Time Chat & Obrolan Langsung",
  description: "High-performance, frictionless real-time room chat powered by Next.js and Vercel serverless architecture.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-zinc-800 selection:text-zinc-100">
        <AuthProvider>
          {children}
          <DmNotificationManager />
        </AuthProvider>
      </body>
    </html>
  );
}
