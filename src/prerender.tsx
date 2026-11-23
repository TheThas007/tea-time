import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { LandingPage } from "./pages/LandingPage";
import { QrMenuGuidePage } from "./pages/QrMenuGuidePage";
import { LegalPoliciesPage } from "./pages/LegalPoliciesPage";
import { demoPaths, getPageSeo, getSeoTags, policyAliases, portalPages, publicPages, qrMenuGuidePath } from "./shared/siteSeo";

const policySections = {
  "/terms": "terms",
  "/privacy": "privacy",
  "/refund-policy": "refund",
} as const;

const marketingPages: Record<string, React.ReactElement> = {
  "/": <LandingPage />,
  [qrMenuGuidePath]: <QrMenuGuidePage />,
};

export const paths = [...Object.keys(publicPages), ...Object.keys(policyAliases), ...Object.keys(portalPages), ...demoPaths];

export function renderPage(path: string) {
  const page = getPageSeo(path);
  const head = renderToStaticMarkup(
    <>
      <title>{page.title}</title>
      {getSeoTags(page).map(([tag, attributes, content], index) =>
        React.createElement(tag, {
          ...attributes,
          key: index,
          "data-menyo-seo": "",
          ...(content && { dangerouslySetInnerHTML: { __html: content.replace(/</g, "\\u003c") } }),
        })
      )}
    </>
  );

  const section = policySections[page.canonicalPath as keyof typeof policySections];
  const content = marketingPages[path] ?? (section && <LegalPoliciesPage initialSection={section} />);
  const body = content ? renderToStaticMarkup(<StaticRouter location={path}>{content}</StaticRouter>) : "";
  return { head, body };
}
