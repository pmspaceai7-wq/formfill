import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full">
      <body className="h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
