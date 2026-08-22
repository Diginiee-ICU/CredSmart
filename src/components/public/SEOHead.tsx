import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  structuredData?: Record<string, any> | Record<string, any>[];
}

export function SEOHead({
  title,
  description,
  keywords = "free GST billing software India, POS billing software, GST invoicing app, inventory management, Udhar Khata, thermal billing printer, Vyapar alternative",
  canonicalUrl = "https://credsmart.in/",
  ogType = "website",
  ogImage = "https://credsmart.in/og-image.png",
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    // Set Title
    document.title = title.includes("CredSmart") ? title : `${title} | CredSmart POS`;

    // Helper to update or create a meta tag
    const setMetaTag = (attr: "name" | "property", key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Primary Meta Tags
    setMetaTag("name", "description", description);
    setMetaTag("name", "keywords", keywords);
    setMetaTag("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    // Canonical Tag
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // OpenGraph Meta Tags
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("property", "og:url", canonicalUrl);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:site_name", "CredSmart POS");
    setMetaTag("property", "og:locale", "en_IN");

    // Twitter Card Meta Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", ogImage);
    setMetaTag("name", "twitter:site", "@credsmart");

    // JSON-LD Structured Data
    const scriptId = "seo-structured-data";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (structuredData) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(structuredData);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Cleanup on unmount if needed
    };
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, structuredData]);

  return null;
}

export default SEOHead;
