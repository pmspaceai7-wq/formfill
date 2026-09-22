import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SpaceFill — Local Form Filler",
  description: "Automate complex PDF forms with intelligent auto-matching. Fill tax, legal, and employment forms in seconds with zero manual typing.",
};

import { AuthProvider } from "@/lib/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="h-full font-sans antialiased bg-slate-50 text-slate-900 selection:bg-indigo-500/20 selection:text-indigo-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
