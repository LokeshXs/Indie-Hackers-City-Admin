import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// The variable names are the ones globals.css maps to Tailwind's font-sans / font-mono tokens,
// so renaming either here silently drops the face rather than erroring.
const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Indie Hackers City — Admin",
  description: "Review achievement claims, award XP, and tune the milestone ladder.",
  // The console is staff-only and its pages carry user emails; keep it out of every index.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-background text-foreground min-h-full flex flex-col">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
