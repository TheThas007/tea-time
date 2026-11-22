import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createServer } from "vite";

const outputDirectory = resolve("dist");
const template = await readFile(resolve(outputDirectory, "index.html"), "utf8");
const headPlaceholder = /<title>Menyo<\/title>\s*<!-- menyo:seo -->/;
const bodyPlaceholder = '<div id="root"></div>';

if (!headPlaceholder.test(template) || !template.includes(bodyPlaceholder)) {
  throw new Error("Menyo’s HTML template is missing its prerender placeholders.");
}

const renderer = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null, ws: false },
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
});
try {
  const { paths, renderPage } = await renderer.ssrLoadModule("/src/prerender.tsx");
  for (const path of paths) {
    const { head, body } = renderPage(path);
    const html = template
      .replace("<html lang=\"en\">", `<html lang="en" data-menyo-seo-route="${path}">`)
      .replace(headPlaceholder, () => head)
      .replace(bodyPlaceholder, () => `<div id="root">${body}</div>`);
    const filename = resolve(outputDirectory, path === "/" ? "index.html" : `${path.slice(1)}.html`);
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, html);
  }
  console.log(`Prerendered ${paths.length} Menyo routes.`);
} finally {
  await renderer.close();
}
