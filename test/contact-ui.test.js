import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('replaces passive contact card with the direct contact form', () => {
  assert.match(html, /id="contact-form"/);
  assert.doesNotMatch(html, /id="copy-email-btn"/);
  assert.match(html, /Γίνετε μέρος της εξέλιξης του FastRx/);
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
  assert.match(js, /Help shape the future of FastRx/);
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
