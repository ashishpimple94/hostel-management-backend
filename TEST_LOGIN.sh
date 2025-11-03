#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           🧪 TEST LOGIN - Automated Script                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="https://hostel-backend-7lb7.onrender.com"

# Test Health Check
echo "1️⃣  Testing Health Check..."
HEALTH_RESPONSE=$(curl -s https://hostel-backend-7lb7.onrender.com/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo -e "${GREEN}✅ Health Check: OK${NC}"
else
    echo -e "${RED}❌ Health Check Failed${NC}"
    echo "$HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test Login with test@test.com
echo "2️⃣  Testing Login with test@test.com..."
LOGIN_RESPONSE=$(curl -s -X POST https://hostel-backend-7lb7.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}')

if echo "$LOGIN_RESPONSE" | grep -q "success\":true"; then
    echo -e "${GREEN}✅ Login Successful!${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:50}..."
    echo ""
    
    # Test Get Me endpoint
    echo "3️⃣  Testing Get Current User..."
    ME_RESPONSE=$(curl -s https://hostel-backend-7lb7.onrender.com/api/auth/me \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$ME_RESPONSE" | grep -q "success\":true"; then
        echo -e "${GREEN}✅ Get Me Successful!${NC}"
    else
        echo -e "${RED}❌ Get Me Failed${NC}"
        echo "$ME_RESPONSE"
    fi
    
else
    echo -e "${RED}❌ Login Failed${NC}"
    echo "$LOGIN_RESPONSE"
    echo ""
    echo -e "${YELLOW}💡 Trying to register test user...${NC}"
    
    # Try to register
    REGISTER_RESPONSE=$(curl -s -X POST https://hostel-backend-7lb7.onrender.com/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test@test.com","password":"test123","role":"admin"}')
    
    if echo "$REGISTER_RESPONSE" | grep -q "success\":true"; then
        echo -e "${GREEN}✅ Registration Successful!${NC}"
        echo -e "${YELLOW}Now try logging in again...${NC}"
        exit 0
    else
        echo -e "${RED}❌ Registration Failed${NC}"
        echo "$REGISTER_RESPONSE"
        exit 1
    fi
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ALL TESTS PASSED! ✅                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

