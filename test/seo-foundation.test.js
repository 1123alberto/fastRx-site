import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const mobile = await readFile(new URL('mobile/index.html', root), 'utf8');
const office = await readFile(new URL('office/index.html', root), 'utf8');
const app = await readFile(new URL('app.js', root), 'utf8');
const robots = await readFile(new URL('public/robots.txt', root), 'utf8');
const sitemap = await readFile(new URL('public/sitemap.xml', root), 'utf8');
const vercelConfig = await readFile(new URL('vercel.json', root), 'utf8');
const ogImage = await readFile(new URL('public/og-image.png', root));

test('homepage exposes canonical indexation and social metadata', () => {
  assert.match(html, /<title[^>]*>FastRx \| Ηλεκτρονική Συνταγογράφηση για Ιατρούς<\/title>/);
  assert.match(html, /name="description" content="FastRx για ιατρούς: ηλεκτρονική συνταγογράφηση μέσω του Συστήματος Ηλεκτρονικής Συνταγογράφησης \(ΣΗΣ\)/);
  assert.match(app, /"meta-title": "FastRx \| Ηλεκτρονική Συνταγογράφηση για Ιατρούς"/);
  assert.match(app, /"meta-description": "FastRx για ιατρούς: ηλεκτρονική συνταγογράφηση μέσω του Συστήματος Ηλεκτρονικής Συνταγογράφησης \(ΣΗΣ\)/);
  assert.match(html, /rel="canonical" href="https:\/\/fastrx\.gr\/"/);
  assert.match(html, /name="robots" content="index, follow/);
  assert.doesNotMatch(html, /noindex|nofollow/i);
  assert.match(html, /max-image-preview:large/);
  assert.match(html, /property="og:title" content="FastRx \| Ηλεκτρονική Συνταγογράφηση για Ιατρούς"/);
  assert.match(html, /name="twitter:title" content="FastRx \| Ηλεκτρονική Συνταγογράφηση για Ιατρούς"/);
  assert.match(html, /property="og:image" content="https:\/\/fastrx\.gr\/og-image\.png"/);
  assert.match(html, /property="og:image:type" content="image\/png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /property="og:image:alt" content="FastRx — ηλεκτρονική συνταγογράφηση για ιατρούς"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="twitter:image" content="https:\/\/fastrx\.gr\/og-image\.png"/);
  assert.ok(ogImage.length > 0, 'social image should exist');
});

test('homepage includes valid JSON-LD entities', () => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'JSON-LD script should be present');
  const data = JSON.parse(match[1]);
  assert.deepEqual(data['@graph'].map(item => item['@type']), ['Organization', 'WebSite', 'WebApplication']);
  const application = data['@graph'].find(item => item['@type'] === 'WebApplication');
  assert.equal(application.name, 'FastRx');
  assert.equal(application.applicationCategory, 'HealthApplication');
  assert.equal(application.operatingSystem, 'Web');
  assert.equal(application.inLanguage, 'el');
  assert.deepEqual(application.publisher, { '@id': 'https://fastrx.gr/#organization' });
  assert.equal(data['@graph'].find(item => item['@type'] === 'WebSite').inLanguage, 'el');
});

test('robots policy advertises the canonical sitemap', () => {
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/fastrx\.gr\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/fastrx\.gr\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/fastrx\.gr\/<\/loc>\s*<lastmod>2026-09-29<\/lastmod>/);
  assert.match(sitemap, /<loc>https:\/\/fastrx\.gr\/mobile\/<\/loc>\s*<lastmod>2026-10-20<\/lastmod>/);
  assert.match(sitemap, /<loc>https:\/\/fastrx\.gr\/office\/<\/loc>\s*<lastmod>2026-10-20<\/lastmod>/);
  assert.equal((sitemap.match(/<loc>/g) || []).length, 3);
});

test('Office exposes static page-specific metadata and indexable content', () => {
  const title = 'FastRx Office | Ηλεκτρονική Συνταγογράφηση σε Υπολογιστή και Tablet';
  const description = 'FastRx Office για ιατρούς: ηλεκτρονική συνταγογράφηση σε υπολογιστή και tablet μέσω του ΣΗΣ. Δείτε τη ροή εργασίας και ζητήστε πρόσβαση.';
  assert.ok(office.includes(`<title>${title}</title>`));
  assert.ok(office.includes(`name="description" content="${description}"`));
  for (const key of ['og:title', 'twitter:title']) assert.ok(office.includes(`="${key}" content="${title}"`));
  for (const key of ['og:description', 'twitter:description']) assert.ok(office.includes(`="${key}" content="${description}"`));
  assert.match(office, /rel="canonical" href="https:\/\/fastrx\.gr\/office\/"/);
  assert.match(office, /property="og:url" content="https:\/\/fastrx\.gr\/office\/"/);
  assert.match(office, /property="og:locale" content="el_GR"/);
  for (const key of ['robots', 'googlebot']) assert.ok(office.includes(`name="${key}" content="index, follow`));
  for (const key of ['og:image', 'twitter:image']) assert.ok(office.includes(`="${key}" content="https://fastrx.gr/og-image.png"`));
  assert.match(office, /<html lang="el">/);
  assert.match(office, /name="viewport"/);
  assert.doesNotMatch(office, /<script\b|data-i18n|noindex|nofollow/i);
  assert.equal((office.match(/<h1\b/g) || []).length, 1);
  assert.match(office, /<h1[^>]*>FastRx Office — Ηλεκτρονική συνταγογράφηση σε υπολογιστή και tablet<\/h1>/);
  let previousLevel = 0;
  for (const [, level] of office.matchAll(/<h([1-6])\b/g)) {
    assert.ok(Number(level) <= previousLevel + 1, 'heading levels must not skip');
    previousLevel = Number(level);
  }
  for (const [, target] of office.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(office.includes(`id="${target}"`));
});

test('Office preserves supported scope, access boundaries, clinical disclaimers, and navigation', () => {
  assert.match(office, /Αναζήτηση ασθενούς και καταχώριση και διαχείριση επισκέψεων στο ΣΗΣ, όπου υποστηρίζεται/);
  assert.match(office, /ICD-10/);
  assert.match(office, /μετά από επιβεβαίωση του ιατρού/);
  assert.match(office, /δημιουργία παραπεμπτικών όπου εφαρμόζεται και υποστηρίζεται από το ΣΗΣ/);
  assert.match(office, /Η διαχείριση επισκέψεων στο ΣΗΣ δεν αποτελεί υποβολή δαπανών ή αιτημάτων αποζημίωσης μέσω eΔΑΠΥ\./);
  assert.match(office, /μόνο κατόπιν πρόσκλησης σε ιατρούς/);
  assert.match(office, /κανονική αυθεντικοποίηση στο ΣΗΣ/);
  assert.match(office, /Τα διαπιστευτήρια του ΣΗΣ από μόνα τους δεν παρέχουν πρόσβαση στο FastRx/);
  for (const className of ['status-main-text', 'status-disclaimer-text']) {
    const tag = className === 'status-main-text' ? 'div' : 'p';
    const content = html.match(new RegExp(`<${tag} class="${className}"[^>]*>([\\s\\S]*?)<\\/${tag}>`))[1];
    assert.ok(office.includes(content), `${className} must preserve homepage wording`);
  }
  for (const href of ['/', '/mobile/', 'https://office.fastrx.gr/', 'https://fastrx.gr/#contact']) assert.ok(office.includes(`href="${href}"`));
  assert.match(html, /<a href="\/office\/">FastRx Office<\/a>/);
  assert.ok(app.includes('<a href=\\"/office/\\">FastRx Office</a>'), 'homepage script must preserve the Office link');
  assert.match(office, /<img[^>]*class="office-product-preview"[^>]*src="\/fastrx-office-mobile-preview-safe\.png"[^>]*width="1614"[^>]*height="975"[^>]*loading="lazy"/);
});

test('Mobile exposes static page-specific SEO and social metadata without homepage scripts', () => {
  const title = 'FastRx Mobile | Ηλεκτρονική Συνταγογράφηση στο Κινητό';
  const description = 'FastRx Mobile για ιατρούς: ηλεκτρονική συνταγογράφηση στο κινητό μέσω του ΣΗΣ. Δείτε τη ροή εργασίας και πώς να ζητήσετε πρόσβαση.';
  assert.ok(mobile.includes(`<title>${title}</title>`));
  assert.ok(mobile.includes(`name="description" content="${description}"`));
  for (const key of ['og:title', 'twitter:title']) assert.ok(mobile.includes(`="${key}" content="${title}"`));
  for (const key of ['og:description', 'twitter:description']) assert.ok(mobile.includes(`="${key}" content="${description}"`));
  assert.match(mobile, /rel="canonical" href="https:\/\/fastrx\.gr\/mobile\/"/);
  assert.match(mobile, /property="og:url" content="https:\/\/fastrx\.gr\/mobile\/"/);
  assert.match(mobile, /property="og:locale" content="el_GR"/);
  assert.match(mobile, /name="robots" content="index, follow/);
  assert.match(mobile, /<html lang="el">/);
  assert.match(mobile, /name="viewport"/);
  assert.doesNotMatch(mobile, /<script\b|data-i18n|noindex|nofollow/i);
  for (const key of ['og:image', 'twitter:image']) assert.ok(mobile.includes(`="${key}" content="https://fastrx.gr/og-image.png"`));
});

test('Mobile has an accessible workflow, correct access links, and unchanged clinical disclaimers', () => {
  assert.equal((mobile.match(/<h1\b/g) || []).length, 1);
  assert.match(mobile, /<h1[^>]*>FastRx Mobile — Ηλεκτρονική συνταγογράφηση στο κινητό<\/h1>/);
  assert.equal((mobile.match(/<h2\b/g) || []).length, 4);
  assert.equal((mobile.match(/<h3\b/g) || []).length, 5);
  for (const [, target] of mobile.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(mobile.includes(`id="${target}"`));
  assert.match(mobile, /href="https:\/\/app\.fastrx\.gr\/"/);
  assert.match(mobile, /href="https:\/\/fastrx\.gr\/#contact"/);
  assert.match(mobile, /href="\/"/);
  assert.match(mobile, /μόνο κατόπιν πρόσκλησης σε ιατρούς/);
  assert.match(mobile, /κανονική αυθεντικοποίηση στο ΣΗΣ/);
  assert.match(mobile, /Τα διαπιστευτήρια του ΣΗΣ από μόνα τους δεν παρέχουν πρόσβαση στο FastRx/);
  for (const className of ['status-main-text', 'status-disclaimer-text']) {
    const tag = className === 'status-main-text' ? 'div' : 'p';
    const content = html.match(new RegExp(`<${tag} class="${className}"[^>]*>([\\s\\S]*?)<\\/${tag}>`))[1];
    assert.ok(mobile.includes(content), `${className} must preserve homepage wording`);
  }
  assert.match(html, /<a href="\/mobile\/">FastRx Mobile<\/a>/);
  assert.ok(app.includes('<a href=\\"/mobile/\\">FastRx Mobile</a>'), 'homepage script must preserve the link');
});

test('homepage has a single meaningful H1 and logical section headings', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok((html.match(/<h2\b/g) || []).length >= 4);
  assert.ok((html.match(/<h3\b/g) || []).length >= 5);
  assert.doesNotMatch(html, /<a href="#"/);
  assert.match(html, /<html lang="el">/);
  assert.doesNotMatch(html, /hreflang/i);
  assert.doesNotMatch(html, /og:locale:alternate|en_US/);
  assert.doesNotMatch(html, /early.access|pre-launch|prelaunch|beta application|before launch/i);
});

test('deployment configuration parses as JSON and excludes web manifest', () => {
  assert.doesNotThrow(() => JSON.parse(vercelConfig));
  assert.doesNotMatch(vercelConfig, /site\.webmanifest/);
});

test('canonical fastrx logo is referenced across head, header, and json-ld, and web manifest is removed', async () => {
  const iconSvg = await readFile(new URL('public/fastrx-icon.svg', root));
  const faviconSvg = await readFile(new URL('public/favicon.svg', root));
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const data = JSON.parse(match[1]);
  const organization = data['@graph'].find(item => item['@type'] === 'Organization');

  assert.ok(iconSvg.length > 20000, 'canonical SVG logo should exist and contain full vector data');
  assert.equal(iconSvg.length, faviconSvg.length, 'favicon.svg should be synchronized with canonical fastrx-icon.svg');
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/fastrx-icon\.svg">/);
  assert.match(html, /<img class="brand-logo" src="\/fastrx-icon\.svg" alt="FastRx"/);
  assert.equal(organization.logo, 'https://fastrx.gr/fastrx-icon.svg');
  assert.doesNotMatch(html, /rel="manifest"/i);
});

