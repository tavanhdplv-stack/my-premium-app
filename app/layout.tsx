import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tawan East - ລະບົບຈັດການອໍເດີ",
  description: "ລະບົບຈັດການອໍເດີແລະຄລັງສາງສໍາລັບ Tawan East Shop",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)",  color: "#030712" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tawan East",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="lo"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-lao transition-colors duration-300">
        <ThemeProvider>
          <ErrorBoundary>
            {/* Premium Minimal Organic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[var(--background)]">
              {/* Top Right Teal Blob */}
              <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-teal-500/10 to-teal-300/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse" style={{ animationDuration: '10s' }} />
              {/* Bottom Left Amber Blob */}
              <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-teal-400/10 to-amber-500/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse" style={{ animationDuration: '15s' }} />
              {/* Center Subtle Glow */}
              <div className="absolute top-[30%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-teal-600/5 blur-[100px] opacity-50" />
              
              {/* Glass Overlay Pattern (Optional subtle texture) */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.04]" />
            </div>
            
            <div className="relative z-0 flex flex-col min-h-screen">
              {children}
            </div>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
