import { useEffect } from "react";
import { useWhiteLabel } from "@/context/WhiteLabelContext";

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
  structuredData?: Record<string, any> | Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  const { brand, isWhiteLabeled } = useWhiteLabel();

  useEffect(() => {
    const activeBaseUrl = isWhiteLabeled && typeof window !== "undefined" ? window.location.origin : DEFAULT_BASE_URL;
    const brandName = isWhiteLabeled ? brand.brand_name : "CredSmart";
    const siteSuffix = isWhiteLabeled
      ? brand.powered_by_text && !brand.hide_platform_branding
        ? `${brand.brand_name} by ${brand.powered_by_text}`
        : brand.brand_name
      : "CredSmart by CredAlert";

    // Resolve absolute canonical URL
    const resolvedCanonical = canonicalUrl
      ? (canonicalUrl.startsWith("http") ? canonicalUrl : `${activeBaseUrl}${canonicalUrl.startsWith("/") ? "" : "/"}${canonicalUrl}`)
      : `${activeBaseUrl}/`;

    // Title formatting
    const effectiveTitle = isWhiteLabeled
      ? brand.meta_title || (title.replace(/CredSmart(\s+by\s+CredAlert)?/gi, brandName))
      : title;
    const formattedTitle = effectiveTitle.includes(brandName) ? effectiveTitle : `${effectiveTitle} | ${siteSuffix}`;
    document.title = formattedTitle;

    const effectiveDescription = isWhiteLabeled && brand.meta_description ? brand.meta_description : description;
    const effectiveOgImage = isWhiteLabeled ? brand.logo_light_url || brand.favicon_url || ogImage : ogImage;
    const effectiveAuthor = isWhiteLabeled ? siteSuffix : author;

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
    setMetaTag("name", "description", effectiveDescription);
    setMetaTag("name", "keywords", isWhiteLabeled ? brandName : keywords);
    setMetaTag("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMetaTag("name", "author", effectiveAuthor);

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
    setMetaTag("property", "og:description", effectiveDescription);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("property", "og:url", resolvedCanonical);
    setMetaTag("property", "og:image", effectiveOgImage);
    setMetaTag("property", "og:site_name", siteSuffix);
    setMetaTag("property", "og:locale", "en_IN");

    if (publishedTime) setMetaTag("property", "article:published_time", publishedTime);
    if (modifiedTime) setMetaTag("property", "article:modified_time", modifiedTime);
    if (effectiveAuthor) setMetaTag("property", "article:author", effectiveAuthor);

    // Twitter Card Meta Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", formattedTitle);
    setMetaTag("name", "twitter:description", effectiveDescription);
    setMetaTag("name", "twitter:image", effectiveOgImage);
    if (!isWhiteLabeled) {
      setMetaTag("name", "twitter:site", "@credalert");
      setMetaTag("name", "twitter:creator", "@credalert");
    }

    // Build Structured Data Array
    const schemasToInject: Record<string, any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

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
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, structuredData, breadcrumbs, publishedTime, modifiedTime, author, brand, isWhiteLabeled]);

  return null;
}

export default SEOHead;
