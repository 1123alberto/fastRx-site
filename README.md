# FastRx Pre-Launch Landing Page

Bilingual pre-launch landing page for FastRx hosted at [fastrx.gr](https://fastrx.gr).

FastRx is a clinical workflow application for doctors, currently in development to streamline the electronic prescribing process (patient lookup, ICD-10 diagnosis selection, medication template selection, doctor review, approval, and submission).

## Features

- **Bilingual Content Support**: Seamless localization for Greek (GR) and English (EN) with toggle state remembered in `localStorage` and automatic browser language detection.
- **Premium Aesthetics**: Styled with a minimal, modern medical SaaS theme leveraging the FastRx cerulean/teal color tokens (`--theme-50` to `--theme-900`) and custom vector-based illustrations.
- **Zero Heavy Runtime Dependencies**: Vanilla HTML, CSS, and JS ensuring near-instantaneous page loads, optimal 100/100 Lighthouse performance scores, and excellent mobile-first responsiveness.
- **Bilingual SEO/Open Graph Setup**: Pre-configured meta tags for Search Engine Optimization and rich snippet preview support.
- **Contact Action Integrations**: Active click-to-email button and built-in clipboard copying for the institutional contact address (`info@fastrx.gr`) with micro-interaction feedback.
- **Compliant Disclaimers**: Clear indicators showing application development status and necessary institutional API approval restrictions.

---

## File Structure

```text
├── index.html          # Semantic HTML markup, SEO tags, and SVG assets
├── styles.css          # Vanilla CSS layout, styles, variables, and animations
├── app.js              # Localization copy object, toggles, copy-to-clipboard, and modal handlers
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

### Production Build

Compile and minify the static files for production deployment:
```bash
npm run build
```
This command compiles the files into the `dist/` directory, optimized for immediate hosting on GitHub Pages, Vercel, Netlify, Cloudflare Pages, or traditional Apache/Nginx servers.

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
