import fs from "node:fs/promises";
import path from "node:path";

const siteUrl = (process.env.SITEMAP_SITE_URL || "https://smart-learn-ai-olive.vercel.app").replace(/\/$/, "");
const apiUrl = (process.env.SITEMAP_API_URL || "https://smart-learn-ai-9byl.onrender.com").replace(/\/$/, "");
const outputPath = path.resolve("public", "sitemap.xml");

const staticRoutes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/courses", changefreq: "weekly", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/careers", changefreq: "weekly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/test", changefreq: "weekly", priority: "0.7" },
  { path: "/privacy", changefreq: "yearly", priority: "0.4" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
];

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toUrlEntry = ({ path: routePath, changefreq, priority, lastmod }) => `  <url>
    <loc>${escapeXml(`${siteUrl}${routePath}`)}</loc>
    ${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const buildDynamicBlogRoutes = async () => {
  try {
    const data = await fetchJson(`${apiUrl}/api/public/blog`);
    const posts = Array.isArray(data?.posts) ? data.posts : [];

    return posts
      .filter((post) => post?._id)
      .map((post) => ({
        path: `/blog/${post._id}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: post.updatedAt || post.publishedAt || post.createdAt || undefined,
      }));
  } catch (error) {
    console.warn(`[sitemap] Failed to fetch blog URLs: ${error.message}`);
    return [];
  }
};

const buildSitemap = async () => {
  const dynamicBlogRoutes = await buildDynamicBlogRoutes();
  const routes = [...staticRoutes, ...dynamicBlogRoutes];
  const body = routes.map(toUrlEntry).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, xml, "utf8");
  console.log(`[sitemap] Generated ${routes.length} URLs at ${outputPath}`);
};

buildSitemap().catch((error) => {
  console.error(`[sitemap] Generation failed: ${error.message}`);
  process.exitCode = 1;
});

