import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "UX-Lens",
  description: "ביקורות UI/UX אוטומטיות לאתרים ציבוריים."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
