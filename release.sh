#!/bin/bash

set -e  # Exit on any error

echo "🚀 Building BabyCheck for release..."

# Navigate to frontend directory
cd frontend/babycheck-front

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building React app..."
npm run build

echo "📁 Copying build files to static directory..."
# Remove old static files (except images and manifest files we want to keep)
rm -rf ../../static/static/
rm -f ../../static/asset-manifest.json
rm -f ../../static/index.html

# Copy new build files
cp -r build/* ../../static/

echo "🧹 Cleaning up..."
# Navigate back to root
cd ../..

echo "✅ Build complete! Static files are ready for commit."
echo ""
echo "Files updated in /static/:"
ls -la static/
echo ""
echo "Next steps:"
echo "1. Review the changes: git status"
echo "2. Add files: git add static/"
echo "3. Commit: git commit -m 'Update build artifacts'"