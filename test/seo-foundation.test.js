import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const app = await readFile(new URL('app.js', root), 'utf8');
const robots = await readFile(new URL('public/robots.txt', root), 'utf8');
const sitemap = await readFile(new URL('public/sitemap.xml', root), 'utf8');
const manifest = await readFile(new URL('public/site.webmanifest', root), 'utf8');
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
  assert.match(sitemap, /<lastmod>2026-09-25<\/lastmod>/);
  assert.equal((sitemap.match(/<loc>/g) || []).length, 1);
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

test('manifest and deployment configuration parse as JSON', () => {
  assert.doesNotThrow(() => JSON.parse(manifest));
  assert.doesNotThrow(() => JSON.parse(vercelConfig));
});
