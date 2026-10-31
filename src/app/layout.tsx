import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartyHub — Multiplayer Party Games",
  description: "Play Skribbl, Gartic Phone, and party games online with your friends!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

