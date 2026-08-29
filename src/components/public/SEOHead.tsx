import { useEffect } from "react";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  structuredData?: Record<string, any> | Record<string, any>[];
  breadcrumbs?: BreadcrumbItem[];
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

const DEFAULT_BASE_URL = "https://pos.credalert.bussiness";
const DEFAULT_OG_IMAGE = "https://pos.credalert.bussiness/og-image.png";
const DEFAULT_KEYWORDS =
  "free GST billing software India, POS billing software, GST invoicing app, inventory management, Udhar Khata, thermal billing printer, Vyapar alternative free, myBillBook alternative free, CredAlert credit intelligence";

export function SEOHead({
  title,
  description,
  keywords = DEFAULT_KEYWORDS,
  canonicalUrl,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  structuredData,
  breadcrumbs,
  publishedTime,
  modifiedTime,
  author = "CredSmart by CredAlert",
}: SEOHeadProps) {
  useEffect(() => {
    // Resolve absolute canonical URL
    const resolvedCanonical = canonicalUrl
      ? (canonicalUrl.startsWith("http") ? canonicalUrl : `${DEFAULT_BASE_URL}${canonicalUrl.startsWith("/") ? "" : "/"}${canonicalUrl}`)
      : `${DEFAULT_BASE_URL}/`;

    // Title formatting
    const formattedTitle = title.includes("CredSmart") ? title : `${title} | CredSmart by CredAlert`;
    document.title = formattedTitle;

    // Helper for meta tags
    const setMetaTag = (attr: "name" | "property", key: string, content: string) => {
      if (!content) return;
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
    setMetaTag("name", "author", author);

    // Canonical Tag
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", resolvedCanonical);

    // OpenGraph Meta Tags
    setMetaTag("property", "og:title", formattedTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("property", "og:url", resolvedCanonical);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:site_name", "CredSmart by CredAlert");
    setMetaTag("property", "og:locale", "en_IN");

    if (publishedTime) setMetaTag("property", "article:published_time", publishedTime);
    if (modifiedTime) setMetaTag("property", "article:modified_time", modifiedTime);
    if (author) setMetaTag("property", "article:author", author);

    // Twitter Card Meta Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", formattedTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", ogImage);
    setMetaTag("name", "twitter:site", "@credalert");
    setMetaTag("name", "twitter:creator", "@credalert");

    // Build Structured Data Array
    const schemasToInject: Record<string, any>[] = [];

    // Optional BreadcrumbList Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemasToInject.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: item.name,
          item: item.url.startsWith("http") ? item.url : `${DEFAULT_BASE_URL}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
        })),
      });
    }

    // Custom Passed Schemas
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        schemasToInject.push(...structuredData);
      } else {
        schemasToInject.push(structuredData);
      }
    }

    // Inject Scripts into Head
    const scriptId = "seo-dynamic-structured-data";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (schemasToInject.length > 0) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schemasToInject.length === 1 ? schemasToInject[0] : schemasToInject);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, structuredData, breadcrumbs, publishedTime, modifiedTime, author]);

  return null;
}

export default SEOHead;
