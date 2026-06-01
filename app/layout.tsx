// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Art Gallery",
    template: "%s • My Art Gallery",
  },
  description: "Play with hues and fling shapes around.",
  // Favicons & app icons (cache-busted via ?v=2)
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png" }, // 512x512
    ],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180" }],
    shortcut: ["/favicon.ico?v=2"],
  },
  // Link previews (WhatsApp, FB, iMessage, etc.)
  openGraph: {
    title: "My Art Gallery",
    description: "Play with hues and fling shapes around.",
    url: "/",
    siteName: "My Art Gallery",
    images: [
      { url: "/svgs-inline/webapp00001.svg", width: 2732, height: 2048, alt: "My Art Gallery preview" },
    ],
    type: "website",
    locale: "en_US",
  },
  // Twitter/X card
  twitter: {
    card: "summary_large_image",
    title: "My Art Gallery",
    description: "Play with hues and fling shapes around.",
    images: ["/svgs-inline/webapp00001.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* You can add global classes or fonts to <body> if you like */}
      <body>{children}</body>
    </html>
  );
}
