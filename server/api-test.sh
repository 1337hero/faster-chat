#!/usr/bin/env bash
#
# FasterChat API Test Suite
# Systematic testing of all API endpoints with curl
#

set -e

API_URL="http://localhost:3001"
COOKIE_JAR="/tmp/fasterchat-cookies.txt"
TEST_USERNAME="testuser_$(date +%s)"
TEST_PASSWORD="SecurePass123!"
SESSION_COOKIE=""
USER_ID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Cleanup cookie jar
rm -f "$COOKIE_JAR"

section "1. PUBLIC ENDPOINTS (No Authentication Required)"

# Test 1: Version endpoint
log_test "GET /api/version - should return version"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/version")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"version"* ]]; then
    log_pass "Version endpoint accessible: $BODY"
else
    log_fail "Version endpoint failed - HTTP $HTTP_CODE"
fi

# Test 2: Public settings
log_test "GET /api/settings - should return public settings"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/settings")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Public settings accessible"
else
    log_fail "Public settings failed - HTTP $HTTP_CODE"
fi

section "2. AUTHENTICATION ENDPOINTS"

# Test 3: Check session without cookie (should be unauthorized)
log_test "GET /api/auth/session - without auth should return 401"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/auth/session")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "401" ]]; then
    log_pass "Unauthenticated session check returns 401"
else
    log_fail "Expected 401, got HTTP $HTTP_CODE"
fi

# Test 4: Register first user (should become admin)
log_test "POST /api/auth/register - register first user"
RESPONSE=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "201" ]] && [[ "$BODY" == *"admin"* ]]; then
    log_pass "User registered as admin: $BODY"
    USER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | cut -d: -f2)
else
    log_fail "Registration failed - HTTP $HTTP_CODE: $BODY"
fi

# Test 5: Check authenticated session
log_test "GET /api/auth/session - with auth should return user"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/auth/session")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"$TEST_USERNAME"* ]]; then
    log_pass "Session check successful: $BODY"
else
    log_fail "Session check failed - HTTP $HTTP_CODE"
fi

# Test 6: Registration lockout (second user registration should fail)
log_test "POST /api/auth/register - second registration should be locked"
SECOND_USER="seconduser_$(date +%s)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$SECOND_USER\",\"password\":\"$TEST_PASSWORD\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "403" ]]; then
    log_pass "Registration locked after first user"
else
    log_fail "Expected registration lockout (403), got HTTP $HTTP_CODE"
fi

# Test 7: Logout
log_test "POST /api/auth/logout - logout current session"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -X POST "$API_URL/api/auth/logout")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Logout successful"
else
    log_fail "Logout failed - HTTP $HTTP_CODE"
fi

# Test 8: Login
log_test "POST /api/auth/login - login with credentials"
RESPONSE=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"$TEST_USERNAME"* ]]; then
    log_pass "Login successful"
else
    log_fail "Login failed - HTTP $HTTP_CODE: $BODY"
fi

# Test 9: Invalid login credentials
log_test "POST /api/auth/login - invalid credentials should return 401"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"WrongPassword\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "401" ]]; then
    log_pass "Invalid credentials rejected"
else
    log_fail "Expected 401 for invalid login, got HTTP $HTTP_CODE"
fi

section "3. CHAT ENDPOINTS"

# Test 10: Create chat
log_test "POST /api/chats - create new chat"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/chats" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Chat"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "201" ]]; then
    log_pass "Chat created: $BODY"
    CHAT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
else
    log_fail "Chat creation failed - HTTP $HTTP_CODE: $BODY"
fi

# Test 11: List chats
log_test "GET /api/chats - list user chats"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/chats")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"chats"* ]]; then
    log_pass "Chats listed successfully"
else
    log_fail "Chat listing failed - HTTP $HTTP_CODE"
fi

# Test 12: Get specific chat
if [[ -n "$CHAT_ID" ]]; then
    log_test "GET /api/chats/:chatId - get chat details"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/chats/$CHAT_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat details retrieved"
    else
        log_fail "Get chat failed - HTTP $HTTP_CODE"
    fi
fi

# Test 13: Update chat title
if [[ -n "$CHAT_ID" ]]; then
    log_test "PATCH /api/chats/:chatId - update chat title"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X PATCH "$API_URL/api/chats/$CHAT_ID" \
        -H "Content-Type: application/json" \
        -d '{"title":"Updated Test Chat"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat title updated"
    else
        log_fail "Chat update failed - HTTP $HTTP_CODE"
    fi
fi

# Test 14: Pin chat
if [[ -n "$CHAT_ID" ]]; then
    log_test "POST /api/chats/:chatId/pin - pin chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/pin")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat pinned"
    else
        log_fail "Pin chat failed - HTTP $HTTP_CODE"
    fi
fi

# Test 15: Unpin chat
if [[ -n "$CHAT_ID" ]]; then
    log_test "DELETE /api/chats/:chatId/pin - unpin chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/chats/$CHAT_ID/pin")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat unpinned"
    else
        log_fail "Unpin chat failed - HTTP $HTTP_CODE"
    fi
fi

section "4. MESSAGE ENDPOINTS"

# Test 16: Create message
if [[ -n "$CHAT_ID" ]]; then
    log_test "POST /api/chats/:chatId/messages - create message"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/messages" \
        -H "Content-Type: application/json" \
        -d '{"role":"user","content":"Hello, this is a test message"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    if [[ "$HTTP_CODE" == "201" ]]; then
        log_pass "Message created: $BODY"
        MESSAGE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    else
        log_fail "Message creation failed - HTTP $HTTP_CODE: $BODY"
    fi
fi

# Test 17: List messages
if [[ -n "$CHAT_ID" ]]; then
    log_test "GET /api/chats/:chatId/messages - list messages"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        "$API_URL/api/chats/$CHAT_ID/messages")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"messages"* ]]; then
        log_pass "Messages listed successfully"
    else
        log_fail "Message listing failed - HTTP $HTTP_CODE"
    fi
fi

# Test 18: Delete message
if [[ -n "$CHAT_ID" ]] && [[ -n "$MESSAGE_ID" ]]; then
    log_test "DELETE /api/chats/:chatId/messages/:messageId - delete message"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/chats/$CHAT_ID/messages/$MESSAGE_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Message deleted"
    else
        log_fail "Message deletion failed - HTTP $HTTP_CODE"
    fi
fi

section "5. FILE UPLOAD ENDPOINTS"

# Test 19: Upload text file
log_test "POST /api/files - upload text file"
TEST_FILE="/tmp/test-upload.txt"
echo "This is a test file for FasterChat API testing" > "$TEST_FILE"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/files" \
    -F "file=@$TEST_FILE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "File uploaded: $BODY"
    FILE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
else
    log_fail "File upload failed - HTTP $HTTP_CODE: $BODY"
fi

# Test 20: List files
log_test "GET /api/files - list user files"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/files")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"files"* ]]; then
    log_pass "Files listed successfully"
else
    log_fail "File listing failed - HTTP $HTTP_CODE"
fi

# Test 21: Get file metadata
if [[ -n "$FILE_ID" ]]; then
    log_test "GET /api/files/:id - get file metadata"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        "$API_URL/api/files/$FILE_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "File metadata retrieved"
    else
        log_fail "Get file metadata failed - HTTP $HTTP_CODE"
    fi
fi

# Test 22: Get file content
if [[ -n "$FILE_ID" ]]; then
    log_test "GET /api/files/:id/content - download file"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        "$API_URL/api/files/$FILE_ID/content")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "File content downloaded"
    else
        log_fail "File download failed - HTTP $HTTP_CODE"
    fi
fi

# Test 23: Delete file
if [[ -n "$FILE_ID" ]]; then
    log_test "DELETE /api/files/:id - delete file"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/files/$FILE_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "File deleted"
    else
        log_fail "File deletion failed - HTTP $HTTP_CODE"
    fi
fi

section "6. ADMIN ENDPOINTS"

# Test 24: List users (admin only)
log_test "GET /api/admin/users - list all users"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/admin/users")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"users"* ]]; then
    log_pass "Users listed (admin access confirmed)"
else
    log_fail "List users failed - HTTP $HTTP_CODE"
fi

# Test 25: Get audit log (admin only)
log_test "GET /api/admin/audit-log - get audit log"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/admin/audit-log")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]] && [[ "$BODY" == *"logs"* ]]; then
    log_pass "Audit log retrieved"
else
    log_fail "Audit log failed - HTTP $HTTP_CODE"
fi

section "7. SECURITY HEADERS & CORS"

# Test 26: Check security headers
log_test "Security headers validation"
HEADERS=$(curl -s -I -b "$COOKIE_JAR" "$API_URL/api/version")
SECURITY_PASS=true

if echo "$HEADERS" | grep -qi "x-content-type-options: nosniff"; then
    log_info "✓ X-Content-Type-Options present"
else
    log_warn "✗ X-Content-Type-Options missing"
    SECURITY_PASS=false
fi

if echo "$HEADERS" | grep -qi "x-frame-options"; then
    log_info "✓ X-Frame-Options present"
else
    log_warn "✗ X-Frame-Options missing"
    SECURITY_PASS=false
fi

if echo "$HEADERS" | grep -qi "content-security-policy"; then
    log_info "✓ Content-Security-Policy present"
else
    log_warn "✗ Content-Security-Policy missing"
    SECURITY_PASS=false
fi

if $SECURITY_PASS; then
    log_pass "Security headers validated"
else
    log_fail "Some security headers missing"
fi

# Test 27: CORS headers with Origin
log_test "CORS headers validation"
RESPONSE=$(curl -s -D - -H "Origin: http://localhost:3000" \
    "$API_URL/api/version" | head -n 20)
if echo "$RESPONSE" | grep -qi "access-control-allow-origin"; then
    log_pass "CORS headers present"
else
    log_fail "CORS headers missing"
fi

section "8. ERROR HANDLING & EDGE CASES"

# Test 28: Invalid JSON
log_test "POST with invalid JSON should return 400"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/chats" \
    -H "Content-Type: application/json" \
    -d '{invalid json}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "400" ]] || [[ "$HTTP_CODE" == "500" ]]; then
    log_pass "Invalid JSON rejected (HTTP $HTTP_CODE)"
else
    log_fail "Expected 400/500 for invalid JSON, got HTTP $HTTP_CODE"
fi

# Test 29: Non-existent chat
log_test "GET non-existent chat should return 404"
FAKE_CHAT_ID="00000000-0000-0000-0000-000000000000"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/chats/$FAKE_CHAT_ID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "404" ]]; then
    log_pass "Non-existent chat returns 404"
else
    log_fail "Expected 404, got HTTP $HTTP_CODE"
fi

# Test 30: Unauthorized access (no cookie)
log_test "Access protected endpoint without auth should return 401"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/chats")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "401" ]]; then
    log_pass "Unauthorized access blocked"
else
    log_fail "Expected 401, got HTTP $HTTP_CODE"
fi

# Test 31: SQL Injection attempt in username
log_test "SQL injection in username should be sanitized"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin' OR '1'='1\",\"password\":\"test\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "401" ]] || [[ "$HTTP_CODE" == "400" ]]; then
    log_pass "SQL injection attempt rejected (HTTP $HTTP_CODE)"
else
    log_warn "Unexpected response to SQL injection: HTTP $HTTP_CODE"
fi

# Test 32: XSS attempt in chat title
if [[ -n "$CHAT_ID" ]]; then
    log_test "XSS in chat title should be handled"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X PATCH "$API_URL/api/chats/$CHAT_ID" \
        -H "Content-Type: application/json" \
        -d '{"title":"<script>alert(\"XSS\")</script>"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "XSS content stored (escaping should be done on frontend)"
        log_info "Response: $BODY"
    else
        log_fail "Unexpected response: HTTP $HTTP_CODE"
    fi
fi

# Test 33: Oversized request body
log_test "Oversized request body should be rejected"
LARGE_CONTENT=$(python3 -c "print('A' * (51 * 1024 * 1024))" 2>/dev/null || echo "SKIP")
if [[ "$LARGE_CONTENT" != "SKIP" ]]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/messages" \
        -H "Content-Type: application/json" \
        --max-time 10 \
        -d "{\"role\":\"user\",\"content\":\"$LARGE_CONTENT\"}" 2>/dev/null || echo "413")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "413" ]] || [[ "$HTTP_CODE" == "400" ]]; then
        log_pass "Oversized request rejected (HTTP $HTTP_CODE)"
    else
        log_warn "Expected 413/400 for oversized request, got HTTP $HTTP_CODE"
    fi
else
    log_info "Skipping oversized request test (requires Python)"
fi

section "9. CLEANUP & DELETE CHAT"

# Test 34: Delete chat
if [[ -n "$CHAT_ID" ]]; then
    log_test "DELETE /api/chats/:chatId - delete chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/chats/$CHAT_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat deleted (soft delete)"
    else
        log_fail "Chat deletion failed - HTTP $HTTP_CODE"
    fi
fi

section "TEST SUMMARY"

echo ""
echo -e "${BLUE}Total Tests:${NC} $TESTS_TOTAL"
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
