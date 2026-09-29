@echo off
echo ==========================================
echo School Inventory - Netlify Deployment
echo ==========================================
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
echo.

REM Build the project
echo 🔨 Building project...
call npm run build
echo.

REM Deploy to Netlify
echo 🚀 Deploying to Netlify...
echo.
echo You will be prompted to:
echo 1. Login to Netlify (if not already)
echo 2. Choose 'Create & configure a new site'
echo 3. Select your team
echo 4. Choose a site name (or press Enter for random)
echo.
pause
echo.

call netlify deploy --prod

echo.
echo ==========================================
echo ⚠️  IMPORTANT: Set Environment Variables
echo ==========================================
echo.
echo After deployment, you MUST set these environment variables in Netlify:
echo.
echo 1. Go to: Site Settings ^> Environment Variables
echo 2. Add the following:
echo.
echo    VITE_SUPABASE_URL = https://puymnmmvgvypqgbhgtww.supabase.co
echo    VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eW1ubW12Z3Z5cHFnYmhndHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTkwNzAsImV4cCI6MjA4MDA3NTA3MH0.DB_u6kbW3ZrucHN8rZ7rt3a4gIHLI0KHuTWeP9NYako
echo.
echo 3. Trigger a new deploy: Deploys ^> Trigger deploy ^> Clear cache and deploy site
echo.
echo OR use these commands:
echo.
echo   netlify env:set VITE_SUPABASE_URL "https://puymnmmvgvypqgbhgtww.supabase.co"
echo   netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eW1ubW12Z3Z5cHFnYmhndHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTkwNzAsImV4cCI6MjA4MDA3NTA3MH0.DB_u6kbW3ZrucHN8rZ7rt3a4gIHLI0KHuTWeP9NYako"
echo.
echo ==========================================
echo ✅ Deployment Complete!
echo ==========================================
echo.
pause
