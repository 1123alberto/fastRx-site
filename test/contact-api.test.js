import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { buildEmail, deliverContactEmail, forwardBetaAccessRequest, resetRateLimits, validateContactPayload } from '../api/contact.js';

const valid = { name: 'Dr Test', email: 'doctor@example.com', specialty: 'Cardiology and Sleep Medicine', reason: 'feedback', message: 'A useful message from clinical practice.', language: 'gr', company: '' };

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
  assert.equal(validateContactPayload({ ...valid, language: 'en' }).ok, false);
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

const betaEnv = {
  RESEND_API_KEY: 'test-resend-key',
  CONTACT_EMAIL_FROM: 'FastRx <contact@example.com>',
  CONTACT_EMAIL_TO: 'info@fastrx.gr',
  FASTRX_BETA_REQUEST_INGEST_URL: 'https://admin.fastrx.gr/api/internal/beta-requests',
  FASTRX_BETA_REQUEST_INGEST_SECRET: 'super-internal-secret',
};

test('reason=access forwards beta request to Admin-FastRx with 4-field payload and auth header', async () => {
  resetRateLimits();
  let emailSent = false;
  let ingestSent = false;
  let capturedIngestHeaders = null;
  let capturedIngestBody = null;

  const mockFetch = async (url, options) => {
    if (url === 'https://api.resend.com/emails') {
      emailSent = true;
      return { ok: true };
    }
    if (url === betaEnv.FASTRX_BETA_REQUEST_INGEST_URL) {
      ingestSent = true;
      capturedIngestHeaders = options.headers;
      capturedIngestBody = JSON.parse(options.body);
      return { ok: true, status: 201 };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const res = response();
  const body = { ...valid, reason: 'access', specialty: 'Neurology' };
  await handler(
    { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'beta-test-1' }, body },
    res,
    { env: betaEnv, fetchImpl: mockFetch }
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(emailSent, true, 'Resend email must be sent');
  assert.equal(ingestSent, true, 'Admin-FastRx ingestion must be called');
  assert.equal(capturedIngestHeaders['Authorization'], `Bearer ${betaEnv.FASTRX_BETA_REQUEST_INGEST_SECRET}`);
  assert.equal(capturedIngestHeaders['Content-Type'], 'application/json');
  assert.deepEqual(capturedIngestBody, {
    name: 'Dr Test',
    email: 'doctor@example.com',
    specialty: 'Neurology',
    message: 'A useful message from clinical practice.',
  });
  assert.deepEqual(Object.keys(capturedIngestBody).sort(), ['email', 'message', 'name', 'specialty']);
});

test('non-access reasons (issue, feedback, other) do not trigger beta ingestion', async () => {
  for (const reason of ['issue', 'feedback', 'other']) {
    resetRateLimits();
    let emailSent = false;
    let ingestSent = false;

    const mockFetch = async (url) => {
      if (url === 'https://api.resend.com/emails') {
        emailSent = true;
        return { ok: true };
      }
      if (url === betaEnv.FASTRX_BETA_REQUEST_INGEST_URL) {
        ingestSent = true;
        return { ok: true, status: 201 };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const res = response();
    await handler(
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `non-access-${reason}` }, body: { ...valid, reason } },
      res,
      { env: betaEnv, fetchImpl: mockFetch }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(emailSent, true, `Email should be sent for reason=${reason}`);
    assert.equal(ingestSent, false, `Beta ingestion must NOT be called for reason=${reason}`);
  }
});

test('beta ingestion returning 500 does not fail public contact submission after email succeeds', async () => {
  resetRateLimits();
  let emailSent = false;
  let ingestSent = false;

  const mockFetch = async (url) => {
    if (url === 'https://api.resend.com/emails') {
      emailSent = true;
      return { ok: true };
    }
    if (url === betaEnv.FASTRX_BETA_REQUEST_INGEST_URL) {
      ingestSent = true;
      return { ok: false, status: 500 };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const res = response();
  await handler(
    { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'ingest-500-test' }, body: { ...valid, reason: 'access' } },
    res,
    { env: betaEnv, fetchImpl: mockFetch }
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(emailSent, true);
  assert.equal(ingestSent, true);
});

test('beta ingestion throwing network error does not fail public contact submission after email succeeds', async () => {
  resetRateLimits();
  let emailSent = false;

  const mockFetch = async (url) => {
    if (url === 'https://api.resend.com/emails') {
      emailSent = true;
      return { ok: true };
    }
    if (url === betaEnv.FASTRX_BETA_REQUEST_INGEST_URL) {
      throw new Error('Connection refused by remote host');
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const res = response();
  await handler(
    { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'ingest-neterr-test' }, body: { ...valid, reason: 'access' } },
    res,
    { env: betaEnv, fetchImpl: mockFetch }
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(emailSent, true);
});

test('missing beta ingestion configuration still allows access requests to succeed via email', async () => {
  resetRateLimits();
  let emailSent = false;
  let ingestSent = false;

  const envWithoutIngest = {
    RESEND_API_KEY: 'test-resend-key',
    CONTACT_EMAIL_FROM: 'FastRx <contact@example.com>',
    CONTACT_EMAIL_TO: 'info@fastrx.gr',
  };

  const mockFetch = async (url) => {
    if (url === 'https://api.resend.com/emails') {
      emailSent = true;
      return { ok: true };
    }
    ingestSent = true;
    return { ok: true };
  };

  const res = response();
  await handler(
    { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'missing-config-test' }, body: { ...valid, reason: 'access' } },
    res,
    { env: envWithoutIngest, fetchImpl: mockFetch }
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(emailSent, true);
  assert.equal(ingestSent, false);
});

test('forwardBetaAccessRequest helper validates configuration and surfaces provider errors', async () => {
  const sampleData = { name: 'Dr Test', email: 'doctor@example.com', specialty: 'General', message: 'Valid message for testing.' };

  await assert.rejects(
    () => forwardBetaAccessRequest(sampleData, {}),
    /Beta request ingestion is not configured/
  );

  await assert.rejects(
    () => forwardBetaAccessRequest(sampleData, betaEnv, async () => ({ ok: false, status: 401 })),
    /Beta request ingestion rejected with status 401/
  );
});

