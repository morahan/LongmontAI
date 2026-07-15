# Longmont AI - Meetup Website

A futuristic, minimalistic website for the Longmont AI Meetup, built with React, Vite, and Tailwind CSS.

## Tech Stack
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS + CSS Variables (Custom Design System)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is configured for automatic deployment on Vercel.
- Push to `main` triggers a production deployment.

## Local Verification

All repository verification runs locally. Before committing or publishing, run:

```bash
just verify
```

This runs offline dependency and secret scans, the local read-only Codex security review, linting, asset checks, contract tests, and a production build. The repository hooks run the security review for every commit and push after `npm run hooks:install`.
