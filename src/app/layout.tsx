import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DmNotificationManager } from "@/components/notifications/DmNotificationManager";

export const metadata: Metadata = {
  title: "Ayeraa Chat — Modern Real-Time Chat Rooms",
  description: "High-performance, frictionless real-time room chat powered by Next.js and Vercel serverless architecture.",
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
