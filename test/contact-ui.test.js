import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('replaces passive contact card with the direct contact form', () => {
  assert.match(html, /id="contact-form"/);
  assert.doesNotMatch(html, /id="copy-email-btn"/);
  assert.match(html, /Δοκιμάστε το πριν από όλους/);
});

test('required fields, email type, message limits and honeypot are present', () => {
  for (const name of ['name', 'email', 'specialty', 'reason', 'message']) assert.match(html, new RegExp(`name="${name}"[^>]*required`));
  assert.match(html, /name="email" type="email"/);
  assert.match(html, /minlength="20" maxlength="4000"/);
  assert.match(html, /class="honeypot"/);
});

test('reason options and bilingual contact content are available', () => {
  for (const value of ['early-access', 'testing', 'feedback', 'other']) assert.match(html, new RegExp(`value="${value}"`));
  assert.doesNotMatch(html, /value="collaboration"/);
  assert.match(js, /Try it before everyone else/);
  assert.match(js, /Δοκιμάστε το πριν από όλους/);
  assert.match(js, /Your message has been sent/);
  assert.match(js, /Το μήνυμά σας στάλθηκε/);
});

test('specialty selector contains the approved options', () => {
  for (const value of ['dentistry', 'cardiology', 'orthopaedics', 'ent', 'dermatology', 'other']) assert.match(html, new RegExp(`value="${value}"`));
  for (const removed of ['general-practice', 'internal-medicine', 'paediatrics']) assert.doesNotMatch(html, new RegExp(`value="${removed}"`));
});

test('client prevents duplicate submissions and handles success and failure', () => {
  assert.match(js, /if \(submitting \|\| !validateForm\(\)\) return/);
  assert.match(js, /contactForm\.reset\(\)/);
  assert.match(js, /form-success/);
  assert.match(js, /form-error/);
});

test('Greek is the default language when no preference is saved', () => {
  assert.match(js, /let currentLang = 'gr'/);
  assert.match(js, /else \{\s*currentLang = 'gr';\s*\}/);
  assert.doesNotMatch(js, /navigator\.languages/);
});

test('translation script works without module loading', () => {
  assert.match(html, /<script defer src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type="module" src="\.\/app\.js"/);
});

test('hero does not render the removed video poster', () => {
  assert.doesNotMatch(html, /hero-video-(?:wrapper|poster)/);
});

test('every translated element has one entry in each language', () => {
  const contentKeys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(match => match[1]);
  const metaKeys = [...html.matchAll(/data-i18n-meta="([^"]+)"/g)].map(match => (
    match[1] === 'description' ? 'meta-description' : match[1]
  ));
  const requiredKeys = new Set([...contentKeys, ...metaKeys]);

  const greekStart = js.indexOf('  gr: {');
  const englishStart = js.indexOf('  en: {');
  const dictionaryEnd = js.indexOf('\n  }\n};', englishStart);
  const blocks = {
    gr: js.slice(greekStart, englishStart),
    en: js.slice(englishStart, dictionaryEnd)
  };

  for (const [language, block] of Object.entries(blocks)) {
    const keys = [...block.matchAll(/"([^"]+)":/g)].map(match => match[1]);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    assert.deepEqual(duplicates, [], `${language} contains duplicate translation keys`);
    for (const key of requiredKeys) {
      assert.ok(keys.includes(key), `${language} is missing translation key: ${key}`);
    }
  }
});
