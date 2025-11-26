# Vercel Deployment Guide

## Automatic Deployment Setup

This project is configured to automatically deploy to Vercel on every push to the `main` branch.

### Initial Setup

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account

2. **Import Your Repository**
   - Click "Add New Project" in Vercel dashboard
   - Select "Import Git Repository"
   - Choose `morahan/LongmontAI`
   - Vercel will automatically detect the Vite configuration

3. **Configure Project Settings**
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Deploy**
   - Click "Deploy"
   - Wait for the initial build to complete
   - Your site will be live at `https://longmontai.vercel.app` (or similar)

### Automatic Deployments

Once connected, Vercel will automatically:
- ✅ Deploy every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Show deployment status in GitHub

### Custom Domain (Optional)

To use a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Update your DNS settings as instructed

## Current Deployment

Your site will be available at:
- Production: `https://longmontai.vercel.app`
- Every push will trigger a new deployment

## Troubleshooting

If deployment fails:
1. Check the build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify the build works locally: `npm run build`
