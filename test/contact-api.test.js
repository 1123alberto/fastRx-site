import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { buildEmail, deliverContactEmail, resetRateLimits, validateContactPayload } from '../api/contact.js';

const valid = { name: 'Dr Test', email: 'doctor@example.com', specialty: 'Cardiology and Sleep Medicine', reason: 'feedback', message: 'A useful message from clinical practice.', language: 'en', company: '' };

function response() {
  return { statusCode: 200, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('validates and trims a complete payload', () => {
  const result = validateContactPayload({ ...valid, name: '  Dr Test  ', specialty: '  Cardiology and Sleep Medicine  ' });
  assert.equal(result.ok, true);
  assert.equal(result.data.name, 'Dr Test');
  assert.equal(result.data.specialty, 'Cardiology and Sleep Medicine');
});

test('accepts optional and free-text specialty values and rejects overlong or non-string values', () => {
  assert.equal(validateContactPayload({ ...valid, specialty: '' }).ok, true);
  assert.equal(validateContactPayload({ ...valid, specialty: undefined }).ok, true);
  assert.equal(validateContactPayload({ ...valid, specialty: 'A very specific medical specialty' }).ok, true);
  assert.equal(validateContactPayload({ ...valid, specialty: 'x'.repeat(121) }).ok, false);
  assert.equal(validateContactPayload({ ...valid, specialty: 123 }).ok, false);
});

test('accepts only current contact reasons', () => {
  for (const reason of ['access', 'issue', 'feedback', 'other']) assert.equal(validateContactPayload({ ...valid, reason }).ok, true);
  for (const reason of ['early-access', 'testing', 'unknown']) assert.equal(validateContactPayload({ ...valid, reason }).ok, false);
});

test('rejects malformed, incomplete, invalid email, and honeypot payloads', () => {
  assert.equal(validateContactPayload(null).ok, false);
  assert.equal(validateContactPayload({ ...valid, name: '' }).ok, false);
  assert.equal(validateContactPayload({ ...valid, email: 'invalid' }).ok, false);
  assert.equal(validateContactPayload({ ...valid, company: 'spam' }).bot, true);
});

test('contact email is general-purpose, includes reason, and escapes visitor content', () => {
  const email = buildEmail({ ...valid, message: '<script>alert(1)</script>' }, '2026-01-01T00:00:00.000Z');
  assert.equal(email.subject, 'Νέο μήνυμα επικοινωνίας - FastRx');
  assert.match(email.html, /Reason:<\/strong> Feedback or suggestion/);
  assert.match(email.text, /Reason: Feedback or suggestion/);
  assert.match(email.html, /Specialty:<\/strong> Cardiology and Sleep Medicine/);
  assert.match(email.text, /Specialty: Cardiology and Sleep Medicine/);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
});

test('omits the specialty line when specialty is blank', () => {
  const email = buildEmail({ ...valid, specialty: '' }, '2026-01-01T00:00:00.000Z');
  assert.doesNotMatch(email.html, /Specialty:/);
  assert.doesNotMatch(email.text, /Specialty:/);
});

test('delivery uses reply-to and surfaces provider failures', async () => {
  let sent;
  await deliverContactEmail(valid, { RESEND_API_KEY: 'secret', CONTACT_EMAIL_FROM: 'FastRx <sender@example.com>', CONTACT_EMAIL_TO: 'info@fastrx.gr' }, async (_url, options) => { sent = JSON.parse(options.body); return { ok: true }; });
  assert.equal(sent.reply_to, valid.email);
  assert.equal(sent.subject, 'Νέο μήνυμα επικοινωνίας - FastRx');
  await assert.rejects(() => deliverContactEmail(valid, { RESEND_API_KEY: 'secret', CONTACT_EMAIL_FROM: 'sender@example.com' }, async () => ({ ok: false })));
  await assert.rejects(() => deliverContactEmail(valid, {}));
});

test('endpoint rejects incomplete and bot submissions', async () => {
  resetRateLimits();
  for (const body of [{ ...valid, reason: '' }, { ...valid, company: 'website' }]) {
    const res = response();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': Math.random().toString() }, body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('endpoint does not return false success when delivery is unavailable', async () => {
  resetRateLimits();
  const original = { ...process.env };
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_EMAIL_FROM;
  const res = response();
  await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'delivery-test' }, body: valid }, res);
  assert.equal(res.statusCode, 503);
  Object.assign(process.env, original);
});
