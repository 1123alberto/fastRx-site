const SPECIALTIES = new Set(['dentistry', 'cardiology', 'orthopaedics', 'ent', 'dermatology', 'other']);
const REASONS = new Set(['early-access', 'testing', 'feedback', 'other']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rateLimits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

const clean = value => typeof value === 'string' ? value.trim() : '';
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function validateContactPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Malformed request.' };
  if (clean(body.company)) return { ok: false, bot: true, error: 'Request rejected.' };

  const data = {
    name: clean(body.name), email: clean(body.email).toLowerCase(), specialty: clean(body.specialty),
    reason: clean(body.reason), message: clean(body.message), language: clean(body.language)
  };
  if (!data.name || data.name.length > 120) return { ok: false, error: 'Invalid name.' };
  if (!EMAIL_PATTERN.test(data.email) || data.email.length > 254) return { ok: false, error: 'Invalid email.' };
  if (!SPECIALTIES.has(data.specialty)) return { ok: false, error: 'Invalid specialty.' };
  if (!REASONS.has(data.reason)) return { ok: false, error: 'Invalid reason.' };
  if (data.message.length < 20 || data.message.length > 4000) return { ok: false, error: 'Invalid message.' };
  if (!['gr', 'en'].includes(data.language)) return { ok: false, error: 'Invalid language.' };
  return { ok: true, data };
}

export function buildEmail(data, timestamp = new Date().toISOString()) {
  const specialtyLabels = {
    dentistry: 'Dentistry',
    cardiology: 'Cardiology',
    orthopaedics: 'Orthopaedics',
    ent: 'ENT',
    dermatology: 'Dermatology',
    other: 'Other'
  };
  const specialty = specialtyLabels[data.specialty] || data.specialty;

  const html = `
<p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
<p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
<p><strong>Specialty:</strong> ${escapeHtml(specialty)}</p>
<p><strong>Submitted:</strong> ${escapeHtml(timestamp)}</p>
<p><strong>Message:</strong></p>
<p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
  `.trim();

  const text = `Name: ${data.name}\nEmail: ${data.email}\nSpecialty: ${specialty}\nSubmitted: ${timestamp}\n\nMessage:\n${data.message}`;

  return {
    subject: 'Νέο Αίτημα Πρώιμης Πρόσβασης - FastRx',
    html,
    text
  };
}

export async function deliverContactEmail(data, env = process.env, fetchImpl = fetch) {
  const { RESEND_API_KEY, CONTACT_EMAIL_FROM, CONTACT_EMAIL_TO = 'info@fastrx.gr' } = env;
  if (!RESEND_API_KEY || !CONTACT_EMAIL_FROM || !CONTACT_EMAIL_TO) throw new Error('Email delivery is not configured.');
  const content = buildEmail(data);
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: CONTACT_EMAIL_FROM, to: [CONTACT_EMAIL_TO], reply_to: data.email, ...content })
  });
  if (!response.ok) throw new Error('Email provider rejected the request.');
}

function isRateLimited(ip, now = Date.now()) {
  const recent = (rateLimits.get(ip) || []).filter(time => now - time < WINDOW_MS);
  recent.push(now);
  rateLimits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

export function resetRateLimits() { rateLimits.clear(); }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.toLowerCase().startsWith('application/json')) return res.status(415).json({ error: 'JSON required.' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  const result = validateContactPayload(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  try {
    await deliverContactEmail(result.data);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ error: 'Message delivery is currently unavailable.' });
  }
}
