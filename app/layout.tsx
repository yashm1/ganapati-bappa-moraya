import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const origin = getSiteOrigin();

  return {
    metadataBase: new URL(origin),
    title: "Bappa Map | Community Pandal Guide",
    description:
      "Discover Ganapati pandals, check live crowd levels, and share a pandal near you.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Bappa Map",
      description: "A community-powered Ganapati pandal guide",
      images: [{ url: `${origin}/og.png`, width: 1733, height: 909, alt: "Bappa Map community pandal guide" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Bappa Map",
      description: "A community-powered Ganapati pandal guide",
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
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
