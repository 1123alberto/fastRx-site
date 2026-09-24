import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('homepage presents the current FastRx product and controlled access paths', () => {
  assert.match(html, /id="contact-form"/);
  assert.match(html, /https:\/\/app\.fastrx\.gr\//);
  assert.match(html, /href="https:\/\/app\.fastrx\.gr\/"[^>]*data-i18n="hero-cta"/);
  assert.match(html, /Είσοδος στο FastRx/);
  assert.match(html, /href="#contact"[^>]*data-i18n="hero-secondary-cta"/);
  assert.match(html, /Ζητήστε πρόσβαση/);
  assert.match(js, /Η σύνδεση στο ΣΗΣ είναι απαραίτητη για τις λειτουργίες συνταγογράφησης, αλλά δεν παρέχει από μόνη της πρόσβαση στο FastRx/);
  assert.match(html, /data-i18n="hero-access-note"/);
  assert.doesNotMatch(html, /id="lang-btn"|class="lang-selector"/);
  assert.doesNotMatch(js, /currentLang|setLanguage|localStorage|Sign in to FastRx|Request access|Electronic Prescribing/);
  assert.doesNotMatch(html, /Δοκιμάστε το πριν από όλους/);
  assert.doesNotMatch(html, /τελικά στάδια ανάπτυξης/);
});

test('required fields, optional specialty, email type, message limits and honeypot are present', () => {
  for (const name of ['name', 'email', 'reason', 'message']) assert.match(html, new RegExp(`name="${name}"[^>]*required`));
  assert.match(html, /name="email" type="email"/);
  assert.match(html, /id="specialty" name="specialty" type="text" autocomplete="organization-title" maxlength="120"/);
  assert.doesNotMatch(html, /id="specialty"[^>]*required/);
  assert.match(html, /minlength="20" maxlength="4000"/);
  assert.match(html, /class="honeypot"/);
});

test('reason options use current semantics and Greek contact content is available', () => {
  for (const value of ['access', 'issue', 'feedback', 'other']) assert.match(html, new RegExp(`value="${value}"`));
  for (const removed of ['early-access', 'testing']) assert.doesNotMatch(html, new RegExp(`value="${removed}"`));
  assert.match(js, /Επικοινωνήστε με το FastRx/);
  assert.doesNotMatch(js, /Contact FastRx/);
  assert.match(js, /Έχω πρόταση ή σχόλιο/);
  assert.match(html, /Θέλω να ζητήσω πρόσβαση στο FastRx/);
  assert.doesNotMatch(js, /I would like to request FastRx access/);
});

test('privacy copy accurately acknowledges contact-form data processing', () => {
  assert.match(html, /Η φόρμα επικοινωνίας συλλέγει τα στοιχεία/);
  assert.match(html, /Μην υποβάλλετε μέσω της δημόσιας φόρμας/);
  assert.doesNotMatch(html, /Δεν συλλέγουμε, αποθηκεύουμε ή επεξεργαζόμαστε προσωπικά δεδομένα/);
  assert.match(js, /Η φόρμα επικοινωνίας συλλέγει τα στοιχεία/);
});

test('current product capabilities and Sync boundaries are described', () => {
  assert.match(html, /Ροή παραπεμπτικών όπου εφαρμόζεται και υποστηρίζεται/);
  assert.match(html, /Δομημένα πρότυπα, αγαπημένα και πρόσφατα φάρμακα/);
  assert.match(html, /Προαιρετικό FastRx Sync/);
  assert.match(html, /δεν χρησιμοποιείται για αποθήκευση ή συγχρονισμό δεδομένων ασθενών/);
});

test('clinical responsibility and IDIKA relationship are stated', () => {
  assert.match(html, /επίσημες υπηρεσίες του ΣΗΣ/);
  assert.match(html, /Δεν λαμβάνει ανεξάρτητες κλινικές αποφάσεις/);
  assert.match(js, /Δεν λαμβάνει ανεξάρτητες κλινικές αποφάσεις/);
});

test('specialty is optional free text without the old fixed options', () => {
  assert.doesNotMatch(html, /<select[^>]*id="specialty"/);
  for (const value of ['dentistry', 'cardiology', 'orthopaedics', 'ent', 'dermatology']) assert.doesNotMatch(html, new RegExp(`value="${value}"`));
  for (const key of ['specialty-dentistry', 'specialty-cardiology', 'specialty-orthopaedics', 'specialty-ent', 'specialty-dermatology', 'specialty-other']) assert.doesNotMatch(js, new RegExp(key));
});

test('client prevents duplicate submissions and handles success and failure', () => {
  assert.match(js, /if \(submitting \|\| !validateForm\(\)\) return/);
  assert.match(js, /contactForm\.reset\(\)/);
  assert.match(js, /form-success/);
  assert.match(js, /form-error/);
});

test('translation script works without module loading', () => {
  assert.match(html, /<script defer src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type="module" src="\.\/app\.js"/);
});

test('every translated element has one Greek copy entry', () => {
  const contentKeys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(match => match[1]);
  const metaKeys = [...html.matchAll(/data-i18n-meta="([^"]+)"/g)].map(match => match[1] === 'description' ? 'meta-description' : match[1]);
  const requiredKeys = new Set([...contentKeys, ...metaKeys]);
  const dictionaryEnd = js.indexOf('\n};');
  const keys = [...js.slice(js.indexOf('const COPY = {'), dictionaryEnd).matchAll(/"([^"]+)":/g)].map(match => match[1]);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  assert.deepEqual(duplicates, [], 'Greek copy contains duplicate translation keys');
  for (const key of requiredKeys) assert.ok(keys.includes(key), `Greek copy is missing translation key: ${key}`);
  assert.doesNotMatch(js, /Electronic Prescribing|Contact FastRx|Request access|Privacy Policy/);
});
