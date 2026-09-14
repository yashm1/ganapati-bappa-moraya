import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const origin = getSiteOrigin();

  return {
    metadataBase: new URL(origin),
    title: "Bappa Map | Pandals of India",
    description:
      "Discover Ganapati pandals across India, check live crowd levels, and share a pandal near you.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Bappa Map — Pandals of India",
      description: "Discover Ganapati pandals across India with Bappa Map.",
      images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "Bappa Map — Pandals of India" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Bappa Map — Pandals of India",
      description: "Discover Ganapati pandals across India with Bappa Map.",
      images: [`${origin}/og.png`],
    },
  };
}

function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) return "http://localhost:3000";

  try {
    const url = new URL(configured.startsWith("http") ? configured : `https://${configured}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
      </head>
      <body className={geist.variable}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
