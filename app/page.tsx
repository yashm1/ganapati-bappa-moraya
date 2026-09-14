import { getSiteOrigin, siteDescription } from "@/lib/site-origin";
import { MapExperience } from "./map-experience";

export default function Home() {
  const origin = getSiteOrigin();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: "Bappa Map",
        description: siteDescription,
        inLanguage: "en-IN",
      },
      {
        "@type": "WebApplication",
        "@id": `${origin}/#application`,
        url: origin,
        name: "Bappa Map",
        description: siteDescription,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web browser",
        inLanguage: "en-IN",
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MapExperience />
    </>
  );
}
