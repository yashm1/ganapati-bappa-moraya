import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

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
