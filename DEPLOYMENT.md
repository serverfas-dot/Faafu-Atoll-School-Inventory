# GitHub Pages Deployment Guide

This project is configured for automatic deployment to **GitHub Pages** via GitHub Actions. Every push to `main` (or `master`) triggers a build and deploy.

---

## Step 1 — Push the project to GitHub

1. Create a new repository on GitHub (e.g. `faafu-inventory`).
2. From the project root:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/faafu-inventory.git
   git push -u origin main
   ```

> Your `.env` file is gitignored — the real Supabase keys are **never** committed. A `.env.example` template is included for reference.

---

## Step 2 — Add your secret keys to GitHub

Go to your repository on GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

Add these two secrets (copy the values from your local `.env`):

| Secret name              | Value                                      |
|--------------------------|--------------------------------------------|
| `VITE_SUPABASE_URL`      | `https://puymnmmvgvypqgbhgtww.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(your anon key from .env)*                |

These secrets are encrypted by GitHub and only available to the build workflow. They are never visible in logs or to anyone without repo admin access.

---

## Step 3 — Enable GitHub Pages

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. That's it — the included `.github/workflows/deploy.yml` workflow handles the rest.

---

## Step 4 — Automatic deployment

Every time you push to `main`:

1. GitHub Actions installs dependencies, builds the app (injecting your secret env vars at build time), and uploads the `dist/` folder.
2. The `deploy` job publishes the artifact to GitHub Pages.
3. Your site goes live at: `https://YOUR_USERNAME.github.io/faafu-inventory/`

You can also trigger a deploy manually: **Actions tab → Deploy to GitHub Pages → Run workflow**.

---

## Using a custom domain (optional)

1. Go to **Settings → Pages → Custom domain**.
2. Enter your domain (e.g. `inventory.faafuschool.edu.mv`).
3. Add a `CNAME` record at your DNS provider pointing to `YOUR_USERNAME.github.io`.
4. Once verified, check **Enforce HTTPS**.

With a custom domain the base path is `/` (no repo name prefix), so also add a repository variable:

**Settings → Secrets and variables → Actions → Variables → New repository variable**

| Variable name | Value |
|---------------|-------|
| `VITE_BASE_PATH` | `/` |

> If you set this up, tell your developer so the Vite config can be adjusted to use it.

---

## Security notes

- **Never** commit `.env` — it is in `.gitignore`.
- The Supabase **anon key** is designed to be public (it's embedded in the browser bundle by nature), but storing it as a GitHub Secret keeps it out of your source code and lets you rotate it in one place.
- **Never** put the Supabase **service role key** in frontend code or GitHub Secrets used by this workflow. It is server-side only.
- Row Level Security (RLS) on your Supabase tables is your real data-protection layer — the anon key only allows what your RLS policies permit.

---

## Verify after first deploy

- The site loads at the GitHub Pages URL.
- Login works (Supabase auth connects).
- All pages are reachable (SPA routing via 404.html fallback).
- Check the **Actions** tab if anything fails — the build log shows errors.

---

## Your Supabase reference (keep private)

- **URL**: `https://puymnmmvgvypqgbhgtww.supabase.co`
- **Anon Key**: stored in your local `.env` — copy it into the GitHub Secret `VITE_SUPABASE_ANON_KEY`.
