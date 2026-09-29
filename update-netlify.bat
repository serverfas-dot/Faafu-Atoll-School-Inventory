@echo off
echo ==========================================
echo Updating Netlify Site
echo ==========================================
echo.

echo Building project...
call npm run build

if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo Build complete!
echo.
echo Deploying to Netlify...
echo.

netlify deploy --prod --dir=dist

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Your site has been updated at:
echo https://dashing-fairy-fccdea.netlify.app/
echo.
pause
