import type { Metadata, Viewport } from "next";
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
  title: "PreOrder - ລະບົບຈັດການອໍເດີ",
  description: "ລະບົບຈັດການອໍເດີແລະຄລັງສາງສໍາລັບ PreOrder",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PreOrder",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)",  color: "#030712" },
  ],
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
      <head>
        {/* ── Prevent auto-zoom on input focus (Android Chrome + iOS Safari) ──
            Root cause: browsers zoom when input font-size < 16px at focus time.
            CSS in globals.css handles static elements. This MutationObserver
            catches inputs added dynamically by React after hydration, and uses
            setProperty with 'important' to beat Tailwind's text-sm/text-xs.
        ── */}
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var TAGS = /^(INPUT|TEXTAREA|SELECT)$/;
  function fix(el) {
    if (!TAGS.test(el.tagName)) return;
    if (el.type === 'file') return;
    el.style.setProperty('font-size', '16px', 'important');
    el.style.setProperty('touch-action', 'manipulation', 'important');
  }
  function fixAll() {
    var els = document.querySelectorAll('input:not([type=file]),textarea,select');
    for (var i = 0; i < els.length; i++) fix(els[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAll);
  } else {
    fixAll();
  }
  new MutationObserver(function(records) {
    for (var i = 0; i < records.length; i++) {
      var added = records[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (n.nodeType !== 1) continue;
        fix(n);
        if (n.querySelectorAll) {
          var kids = n.querySelectorAll('input:not([type=file]),textarea,select');
          for (var k = 0; k < kids.length; k++) fix(kids[k]);
        }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
        `}} />
      </head>
      <body className="min-h-full flex flex-col font-lao transition-colors duration-300">
        <ThemeProvider>
          <ErrorBoundary>
            {/* Minimal static background — no heavy animation for best performance */}
            <div className="fixed inset-0 -z-10 bg-[var(--background)]">
              <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-teal-500/10 to-teal-300/10 blur-[120px]" />
              <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-teal-400/10 to-amber-500/10 blur-[120px]" />
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
