#!/bin/bash
set -e

echo "🔨 Building..."
npm run build

echo "📦 Preparing deploy files..."
TEMP_DIR=$(mktemp -d)

# Copy dist contents
cp -r dist/* "$TEMP_DIR/"

# Copy images and assets folders
[ -d images ] && cp -r images "$TEMP_DIR/"
[ -d assets ] && cp -r assets "$TEMP_DIR/"

# Copy public folder contents (Resume.pdf, etc.)
[ -d public ] && cp -r public/* "$TEMP_DIR/"

echo "🔀 Switching to deploy branch..."
# Preserve node_modules across branch switch
mv node_modules /tmp/_deploy_node_modules
git checkout deploy

echo "🧹 Cleaning old files..."
# Remove everything except .git
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +

echo "📋 Copying new files..."
cp -r "$TEMP_DIR"/* .

echo "📄 Creating 404.html..."
cp index.html 404.html

echo "🚀 Committing and pushing..."
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin deploy

echo "🔙 Switching back to master..."
git checkout master
mv /tmp/_deploy_node_modules node_modules
git push origin master

echo "✅ Deploy complete!"

# Cleanup
rm -rf "$TEMP_DIR"
