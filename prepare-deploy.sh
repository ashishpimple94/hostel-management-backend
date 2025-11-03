#!/bin/bash

echo "🚀 Preparing Backend for Deployment..."
echo ""

# Check if in backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from backend directory"
    exit 1
fi

echo "📦 Step 1: Checking git status..."
git status

echo ""
echo "📝 Step 2: Staging all changes..."
git add .

echo ""
read -p "💬 Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Backend ready for production deployment"
fi

echo ""
echo "💾 Committing changes..."
git commit -m "$commit_msg"

echo ""
echo "✅ Files committed!"
echo ""
echo "📤 Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Go to https://render.com and create new web service"
echo "3. Connect your GitHub repository"
echo "4. Add environment variables (see DEPLOY_STEPS.md)"
echo ""
echo "📖 Full guide: DEPLOY_STEPS.md"
echo ""



