import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scheduler Core v1.0 | High-Performance OS Visualizer",
  description: "Ultra-premium single-screen CPU scheduling and visualization platform inspired by Linear, Vercel, and Raycast.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <body className="h-screen w-screen overflow-hidden antialiased" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
        {children}
      </body>
    </html>
  );
}
