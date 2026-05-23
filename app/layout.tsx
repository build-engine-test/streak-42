import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

import { TopNav } from "./_components/top-nav";

// Inter is the design-system font for every Build Engine app.
// Loaded via next/font so CSS variables (--font-inter) are available in
// globals.css's `font-family` rule without an extra network hop.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Streak — Build daily habits",
  description:
    "A minimalist habit tracker. Add a habit, check it off daily, watch your streaks build.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* TopNav is an async Server Component that renders nothing for
              signed-out visitors so the landing page owns the viewport. */}
          <TopNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
