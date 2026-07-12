# FastRx Public Landing Page

Bilingual public landing page for FastRx hosted at [fastrx.gr](https://fastrx.gr).

FastRx is a clinical workflow application for doctors, currently in development to streamline the electronic prescribing process (patient lookup, ICD-10 diagnosis selection, medication template selection, doctor review, approval, and submission). This repository powers the live public website and contact entry point for the service.

## Features

- **Bilingual Content Support**: Seamless localization for Greek (GR) and English (EN), defaulting to Greek while remembering an explicit language selection in `localStorage`.
- **Premium Aesthetics**: Styled with a minimal, modern medical SaaS theme leveraging the FastRx cerulean/teal color tokens (`--theme-50` to `--theme-900`) and custom vector-based illustrations.
- **Zero Heavy Runtime Dependencies**: Vanilla HTML, CSS, and JS ensuring near-instantaneous page loads, optimal 100/100 Lighthouse performance scores, and excellent mobile-first responsiveness.
- **Bilingual SEO/Open Graph Setup**: Pre-configured meta tags for Search Engine Optimization and rich snippet preview support.
- **Direct Contact Form**: Bilingual early-access, testing, feedback, and professional-enquiry form with accessible validation and server-side email delivery.
- **Compliant Disclaimers**: Clear indicators showing application development status and necessary institutional API approval restrictions.

---

## File Structure

```text
├── index.html          # Semantic HTML markup, SEO tags, and SVG assets
├── styles.css          # Vanilla CSS layout, styles, variables, and animations
├── app.js              # Localization, language toggle, form, and modal handlers
├── api/contact.js      # Vercel serverless contact validation and email delivery
├── .env.example       # Contact delivery configuration template
├── test/              # UI contract and server endpoint tests
├── package.json        # Node script dependencies (Vite compiler)
├── vite.config.js      # Bundler settings
└── README.md           # Documentation
```

---

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) (v18+) installed on your machine.

### Installation

1. Navigate to the project root:
   ```bash
   cd fastRx-site
   ```
2. Install compilation dependencies:
   ```bash
   npm install
   ```

### Development Server

Start the local development server to preview modifications in real time:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

Vite previews the page, but it does not run Vercel functions. To test end-to-end delivery locally, install the Vercel CLI and run `vercel dev` after configuring the variables below. Automated tests mock delivery and never send real email.

### Contact form configuration

The serverless contact endpoint sends through [Resend](https://resend.com). Copy `.env.example` to `.env.local` for local Vercel development and set:

- `CONTACT_EMAIL_TO`: destination address (normally `info@fastrx.gr`).
- `CONTACT_EMAIL_FROM`: sender on a domain verified with Resend.
- `RESEND_API_KEY`: secret Resend API key.

Do not use a `VITE_` prefix for these values: they must remain server-only. For Vercel, add all three under Project Settings → Environment Variables for Production, Preview, and Development as appropriate, verify the sender domain in Resend, then redeploy. If configuration is absent or Resend rejects a request, the endpoint returns a controlled `503` response and the browser displays an error; it never reports false success.

For a safe local check, run `npm test`. To exercise actual delivery, use a Resend test recipient or a controlled mailbox and `vercel dev`; never place real credentials in the repository.

### Production Build

Compile and minify the static files for production deployment:
```bash
npm run build
```
This command compiles the files into the `dist/` directory, optimized for immediate hosting on GitHub Pages, Vercel, Netlify, Cloudflare Pages, or traditional Apache/Nginx servers.

Run the full local verification suite with:

```bash
npm test
npm run lint
npm run build
```

---

## Copy Editing

All text content is consolidated in a central object inside [app.js](app.js). To modify headlines, step details, disclaimers, or metadata descriptions, edit the properties inside the `COPY` object structure:

```javascript
const COPY = {
  gr: {
    "hero-title": "Ταχύτερη ηλεκτρονική συνταγογράφηση για ιατρούς.",
    // Greek copy...
  },
  en: {
    "hero-title": "Fast electronic prescribing workflow for doctors.",
    // English copy...
  }
};
```
