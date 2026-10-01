import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExamIntel — AI Exam Intelligence Platform",
  description:
    "Research exams. Compare syllabi. Map prerequisites. Understand difficult questions. Analyse official PDFs. Generate source-grounded MCQs. Evolve PYQs. Build personalized papers. Optimize preparation across multiple exams.",
  keywords: [
    "competitive exams",
    "AI exam intelligence",
    "SSC CGL",
    "GATE",
    "exam preparation",
    "syllabus mapping",
    "dependency graph",
    "PYQ evolution",
    "MCQ generator",
  ],
  authors: [{ name: "ExamIntel" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ExamIntel — AI Exam Intelligence Platform",
    description:
      "Your AI Command Center for Competitive Exams. Research → Understand → Map → Compare → Diagnose → Practice → Generate → Prepare → Simulate → Analyse → Adapt.",
    siteName: "ExamIntel",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* apply theme before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('examintel-store');var v=t?JSON.parse(t):{};var m=v?.state?.theme||'dark';if(m==='system'){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(m==='dark'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
