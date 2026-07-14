import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const robots = await readFile(new URL('public/robots.txt', root), 'utf8');
const sitemap = await readFile(new URL('public/sitemap.xml', root), 'utf8');
const manifest = await readFile(new URL('public/site.webmanifest', root), 'utf8');
const vercelConfig = await readFile(new URL('vercel.json', root), 'utf8');

test('homepage exposes canonical indexation and social metadata', () => {
  assert.match(html, /rel="canonical" href="https:\/\/fastrx\.gr\/"/);
  assert.match(html, /max-image-preview:large/);
  assert.match(html, /property="og:image" content="https:\/\/fastrx\.gr\/og-image\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test('homepage includes valid JSON-LD entities', () => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'JSON-LD script should be present');
  const data = JSON.parse(match[1]);
  assert.deepEqual(data['@graph'].map(item => item['@type']), ['Organization', 'WebSite']);
});

test('robots policy advertises the canonical sitemap', () => {
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/fastrx\.gr\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/fastrx\.gr\/<\/loc>/);
});

test('manifest and deployment configuration parse as JSON', () => {
  assert.doesNotThrow(() => JSON.parse(manifest));
  assert.doesNotThrow(() => JSON.parse(vercelConfig));
});
