#!/bin/bash

echo "=========================================="
echo "Updating Netlify Site"
echo "=========================================="
echo ""

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Deploying to Netlify..."
echo ""

# Deploy to existing site
netlify deploy --prod --dir=dist

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Your site has been updated at:"
echo "https://dashing-fairy-fccdea.netlify.app/"
echo ""
