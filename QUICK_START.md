# Quick Start Guide - Deploy to Netlify

## Three Ways to Deploy

### 🚀 Method 1: Automated Script (Easiest)

**For Mac/Linux:**
```bash
./deploy.sh
```

**For Windows:**
```bash
deploy.bat
```

The script will:
- Install dependencies
- Build the project
- Deploy to Netlify
- Show you what environment variables to set

---

### 🎯 Method 2: Manual CLI Deployment

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Build the project
npm install
npm run build

# 3. Deploy
netlify deploy --prod

# 4. Set environment variables
netlify env:set VITE_SUPABASE_URL "https://puymnmmvgvypqgbhgtww.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eW1ubW12Z3Z5cHFnYmhndHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTkwNzAsImV4cCI6MjA4MDA3NTA3MH0.DB_u6kbW3ZrucHN8rZ7rt3a4gIHLI0KHuTWeP9NYako"
```

---

### 🖱️ Method 3: Drag & Drop (No CLI needed)

1. **Build locally:**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy:**
   - Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
   - Drag the `dist` folder onto the page
   - Wait for deployment to complete

3. **Set Environment Variables:**
   - Click on your deployed site
   - Go to Site Settings → Environment Variables
   - Add these two variables:
     ```
     VITE_SUPABASE_URL = https://puymnmmvgvypqgbhgtww.supabase.co
     VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eW1ubW12Z3Z5cHFnYmhndHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTkwNzAsImV4cCI6MjA4MDA3NTA3MH0.DB_u6kbW3ZrucHN8rZ7rt3a4gIHLI0KHuTWeP9NYako
     ```

4. **Redeploy:**
   - Go to Deploys tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

---

## ⚠️ CRITICAL: Environment Variables

Your site **WILL NOT WORK** without setting these environment variables in Netlify:

```
VITE_SUPABASE_URL = https://puymnmmvgvypqgbhgtww.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eW1ubW12Z3Z5cHFnYmhndHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTkwNzAsImV4cCI6MjA4MDA3NTA3MH0.DB_u6kbW3ZrucHN8rZ7rt3a4gIHLI0KHuTWeP9NYako
```

---

## ✅ After Deployment

1. Visit your Netlify URL
2. Test the login functionality
3. Verify database connections work
4. Check that all pages load correctly

---

## 🆘 Troubleshooting

**Site loads but login doesn't work:**
- Check that environment variables are set correctly in Netlify
- Make sure you triggered a new deploy after setting variables

**Build fails:**
- Run `npm run build` locally to see the error
- Check that all dependencies are installed

**404 errors on page refresh:**
- This should be handled automatically by `netlify.toml`
- Check that the file exists in your project

---

## 📚 More Information

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For project information, see [README.md](./README.md)
