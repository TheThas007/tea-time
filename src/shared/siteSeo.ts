const origin = "https://menyo.org";
const siteName = "Menyo";
const logo = `${origin}/icon-512.png`;
export const qrMenuGuidePath = "/guides/restaurant-qr-menu";

type PageSeo = {
  title: string;
  description?: string;
  canonicalPath?: string;
  noIndex?: boolean;
};

export const publicPages = {
  "/": {
    title: "QR Code Menu for Restaurants & POS | Menyo",
    description: "Create a QR code menu for your restaurant or café. Guests scan, browse, and order from their phones. Manage live kitchen orders and POS billing with Menyo.",
    canonicalPath: "/",
  },
  [qrMenuGuidePath]: {
    title: "How to Create a QR Code Menu for a Restaurant | Menyo",
    description: "Set up a digital restaurant menu, create a QR code for each table, and test the guest ordering flow before you print your QR cards.",
    canonicalPath: qrMenuGuidePath,
  },
  "/terms": {
    title: "Terms and Conditions | Menyo",
    description: "Read Menyo’s terms for restaurant QR menus, subscriptions, billing, and account responsibilities.",
    canonicalPath: "/terms",
  },
  "/privacy": {
    title: "Privacy Policy | Menyo",
    description: "Learn how Menyo collects, uses, and protects information from restaurant operators and customers.",
    canonicalPath: "/privacy",
  },
  "/refund-policy": {
    title: "Refund and Cancellation Policy | Menyo",
    description: "Read Menyo’s subscription cancellation and refund policy and find out how to contact support.",
    canonicalPath: "/refund-policy",
  },
} satisfies Record<string, PageSeo>;

export const policyAliases = {
  "/terms-and-conditions": "/terms",
  "/privacy-policy": "/privacy",
  "/return-policy": "/refund-policy",
} as const;

export const portalPages: Record<string, PageSeo> = {
  "/login": { title: "Sign In | Menyo", noIndex: true },
  "/signup": { title: "Start Your Free Trial | Menyo", noIndex: true },
  "/admin": { title: "Business Dashboard | Menyo", noIndex: true },
  "/admin/login": { title: "Sign In | Menyo", noIndex: true },
  "/dashboard": { title: "Business Dashboard | Menyo", noIndex: true },
  "/super-admin": { title: "Platform Administration | Menyo", noIndex: true },
  "/superadmin": { title: "Platform Administration | Menyo", noIndex: true },
};

export const demoPaths = ["/demo", "/demo/menu"];
const demoSeo: PageSeo = { title: "Live QR Menu Demo | Menyo", noIndex: true };

export function normalizePath(pathname: string) {
  return pathname.toLowerCase().replace(/\/+$/, "") || "/";
}

export function getPageSeo(pathname: string, search = ""): PageSeo {
  const path = normalizePath(pathname);
  const publicPath = (policyAliases as Record<string, string>)[path] ?? path;
  const page = (publicPages as Record<string, PageSeo>)[publicPath] ?? portalPages[path];
  if (page) return page;
  if (/^\/[^/]+\/(?:admin|dashboard)$/.test(path)) return portalPages["/dashboard"];
  if (demoPaths.includes(path) || new URLSearchParams(search).get("demo") === "true") return demoSeo;
  return { title: siteName };
}

const homepageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: `${origin}/`,
      name: siteName,
      publisher: { "@id": `${origin}/#publisher` },
    },
    {
      "@type": "Organization",
      "@id": `${origin}/#publisher`,
      name: "AEVONIX",
      logo,
      email: "aevonixlk@gmail.com",
      telephone: "+94764847081",
    },
    {
      "@type": "WebApplication",
      "@id": `${origin}/#app`,
      name: siteName,
      url: `${origin}/`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      description: publicPages["/"].description,
      publisher: { "@id": `${origin}/#publisher` },
    },
  ],
};

export type SeoTag = ["link" | "meta" | "script", Record<string, string>, string?];

export function getSeoTags(page: PageSeo): SeoTag[] {
  const tags: SeoTag[] = [];
  if (page.noIndex) tags.push(["meta", { name: "robots", content: "noindex, follow" }]);
  if (!page.canonicalPath || !page.description) return tags;

  const url = `${origin}${page.canonicalPath}`;
  tags.push(
    ["link", { rel: "canonical", href: url }],
    ["meta", { name: "description", content: page.description }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: siteName }],
    ["meta", { property: "og:url", content: url }],
    ["meta", { property: "og:title", content: page.title }],
    ["meta", { property: "og:description", content: page.description }],
    ["meta", { property: "og:image", content: logo }],
    ["meta", { property: "og:image:width", content: "512" }],
    ["meta", { property: "og:image:height", content: "512" }],
    ["meta", { property: "og:image:alt", content: "Menyo logo" }],
    ["meta", { name: "twitter:card", content: "summary" }],
  );
  if (page.canonicalPath === "/") {
    tags.push(["script", { type: "application/ld+json" }, JSON.stringify(homepageSchema)]);
  }
  return tags;
}

export function updatePageSeo(pathname: string, search = "") {
  const page = getPageSeo(pathname, search);
  if (document.documentElement.dataset.menyoSeoRoute === `${normalizePath(pathname)}${search}`) return;

  document.title = page.title;
  document.head.querySelectorAll("[data-menyo-seo]").forEach((tag) => tag.remove());
  for (const [name, attributes, content] of getSeoTags(page)) {
    const tag = document.createElement(name);
    tag.setAttribute("data-menyo-seo", "");
    for (const [attribute, value] of Object.entries(attributes)) tag.setAttribute(attribute, value);
    if (content) tag.textContent = content;
    document.head.append(tag);
  }
  document.documentElement.dataset.menyoSeoRoute = `${normalizePath(pathname)}${search}`;
}
