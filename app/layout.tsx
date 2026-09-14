import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getSiteOrigin, siteDescription } from "@/lib/site-origin";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const origin = getSiteOrigin();

  return {
    metadataBase: new URL(origin),
    title: {
      default: "Find Ganesh Pandals in Mumbai & India | Bappa Map",
      template: "%s | Bappa Map",
    },
    description: siteDescription,
    alternates: { canonical: "/" },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Find Ganesh Pandals in Mumbai & India | Bappa Map",
      description: siteDescription,
      url: origin,
      siteName: "Bappa Map",
      locale: "en_IN",
      images: [{ url: "/og.png", width: 1672, height: 941, alt: "Bappa Map — Ganesh pandal map" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Find Ganesh Pandals in Mumbai & India | Bappa Map",
      description: siteDescription,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
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
