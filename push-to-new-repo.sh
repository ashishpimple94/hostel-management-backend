#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Push Backend to New GitHub Repository${NC}"
echo "================================================"
echo ""

# Check if running from backend directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from the backend directory${NC}"
    exit 1
fi

# Prompt for new repository details
echo -e "${YELLOW}Enter your new GitHub repository details:${NC}"
echo ""
read -p "GitHub Username: " USERNAME
read -p "Repository Name: " REPO_NAME
read -p "Remote Name (default: new-origin): " REMOTE_NAME

# Set default remote name
REMOTE_NAME=${REMOTE_NAME:-new-origin}

# Build repository URL
REPO_URL="https://github.com/${USERNAME}/${REPO_NAME}.git"

echo ""
echo -e "${GREEN}📦 Repository Information:${NC}"
echo "   Username: $USERNAME"
echo "   Repo Name: $REPO_NAME"
echo "   Remote Name: $REMOTE_NAME"
echo "   URL: $REPO_URL"
echo ""

# Confirm
read -p "Is this correct? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${RED}❌ Cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔄 Adding remote and pushing...${NC}"

# Add remote
git remote add $REMOTE_NAME $REPO_URL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Remote added successfully${NC}"
else
    echo -e "${RED}❌ Failed to add remote${NC}"
    exit 1
fi

# Push to new repository
echo ""
echo -e "${YELLOW}📤 Pushing code to new repository...${NC}"
git push -u $REMOTE_NAME main

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Successfully pushed to new repository!${NC}"
    echo ""
    echo -e "${GREEN}📋 Your repositories:${NC}"
    git remote -v
    echo ""
    echo -e "${GREEN}🌐 View your new repository:${NC}"
    echo "   https://github.com/${USERNAME}/${REPO_NAME}"
else
    echo -e "${RED}❌ Failed to push. Please check:${NC}"
    echo "   1. Repository exists on GitHub"
    echo "   2. You have push permissions"
    echo "   3. Repository URL is correct"
    exit 1
fi

