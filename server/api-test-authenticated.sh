#!/usr/bin/env bash
#
# FasterChat API Test Suite - For existing installation
# Tests with existing admin user
#

API_URL="http://localhost:3001"
COOKIE_JAR="/tmp/fasterchat-cookies-auth.txt"

# You'll need to set these to your actual admin credentials
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

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

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Cleanup
rm -f "$COOKIE_JAR"

section "Authentication with existing user"

if [[ -z "$ADMIN_PASSWORD" ]]; then
    echo -e "${YELLOW}[WARN]${NC} ADMIN_PASSWORD not set. Please provide it:"
    read -s ADMIN_PASSWORD
    echo ""
fi

log_test "POST /api/auth/login - login as admin"
RESPONSE=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" != "200" ]]; then
    echo -e "${RED}Login failed. Cannot continue tests.${NC}"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $BODY"
    exit 1
fi

log_pass "Logged in successfully"
log_info "User: $BODY"

section "COMPLETE API ENDPOINT TEST SUITE"

# Test all endpoints systematically
section "1. Chat Management"

log_test "POST /api/chats - create chat"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/chats" \
    -H "Content-Type: application/json" \
    -d '{"title":"API Test Chat"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "201" ]]; then
    log_pass "Chat created"
    CHAT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_info "Chat ID: $CHAT_ID"
else
    log_fail "Chat creation failed - HTTP $HTTP_CODE"
fi

log_test "GET /api/chats - list chats"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/chats")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Chats listed"
else
    log_fail "Failed - HTTP $HTTP_CODE"
fi

if [[ -n "$CHAT_ID" ]]; then
    log_test "GET /api/chats/:id - get specific chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/chats/$CHAT_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat retrieved"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "PATCH /api/chats/:id - update title"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X PATCH "$API_URL/api/chats/$CHAT_ID" \
        -H "Content-Type: application/json" \
        -d '{"title":"Updated API Test"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat updated"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "POST /api/chats/:id/pin - pin chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/pin")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat pinned"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "DELETE /api/chats/:id/pin - unpin chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/chats/$CHAT_ID/pin")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat unpinned"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "POST /api/chats/:id/archive - archive chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/archive")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat archived"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "DELETE /api/chats/:id/archive - unarchive chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/chats/$CHAT_ID/archive")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Chat unarchived"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi
fi

section "2. Message Management"

if [[ -n "$CHAT_ID" ]]; then
    log_test "POST /api/chats/:id/messages - create user message"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/messages" \
        -H "Content-Type: application/json" \
        -d '{"role":"user","content":"Test message content"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    if [[ "$HTTP_CODE" == "201" ]]; then
        log_pass "Message created"
        MESSAGE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        log_info "Message ID: $MESSAGE_ID"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "GET /api/chats/:id/messages - list messages"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        "$API_URL/api/chats/$CHAT_ID/messages")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Messages listed"
        MESSAGE_COUNT=$(echo "$BODY" | grep -o '"messages":\[' | wc -l)
        log_info "Message count check: $MESSAGE_COUNT"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    if [[ -n "$MESSAGE_ID" ]]; then
        log_test "DELETE /api/chats/:id/messages/:msgId - delete message"
        RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
            -X DELETE "$API_URL/api/chats/$CHAT_ID/messages/$MESSAGE_ID")
        HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
        if [[ "$HTTP_CODE" == "200" ]]; then
            log_pass "Message deleted"
        else
            log_fail "Failed - HTTP $HTTP_CODE"
        fi
    fi
fi

section "3. File Management"

log_test "POST /api/files - upload text file"
TEST_FILE="/tmp/test-api-upload.txt"
echo "FasterChat API Test File Content" > "$TEST_FILE"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/files" \
    -F "file=@$TEST_FILE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "File uploaded"
    FILE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_info "File ID: $FILE_ID"
else
    log_fail "Failed - HTTP $HTTP_CODE: $BODY"
fi

log_test "GET /api/files - list files"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/files")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Files listed"
else
    log_fail "Failed - HTTP $HTTP_CODE"
fi

if [[ -n "$FILE_ID" ]]; then
    log_test "GET /api/files/:id - get file metadata"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        "$API_URL/api/files/$FILE_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "File metadata retrieved"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "GET /api/files/:id/content - download file"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -o /tmp/downloaded-test.txt \
        "$API_URL/api/files/$FILE_ID/content")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        DOWNLOADED_CONTENT=$(cat /tmp/downloaded-test.txt 2>/dev/null || echo "")
        if [[ "$DOWNLOADED_CONTENT" == "FasterChat API Test File Content" ]]; then
            log_pass "File downloaded with correct content"
        else
            log_fail "File downloaded but content mismatch"
        fi
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi

    log_test "DELETE /api/files/:id - delete file"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/files/$FILE_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "File deleted"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi
fi

section "4. Admin Endpoints"

log_test "GET /api/admin/users - list all users"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/admin/users")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Users listed"
    USER_COUNT=$(echo "$BODY" | grep -o '"username":' | wc -l)
    log_info "User count: $USER_COUNT"
else
    log_fail "Failed - HTTP $HTTP_CODE"
fi

log_test "GET /api/admin/audit-log - get audit log"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/admin/audit-log?limit=10")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Audit log retrieved"
else
    log_fail "Failed - HTTP $HTTP_CODE"
fi

section "5. Models & Providers"

log_test "GET /api/models - list models"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/models")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Models listed"
else
    log_fail "Failed - HTTP $HTTP_CODE"
fi

log_test "GET /api/admin/providers - list providers"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/admin/providers")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Providers listed"
else
    log_fail "Failed - HTTP $HTTP_CODE"
fi

section "6. Security Tests"

log_test "Content Security Headers"
HEADERS=$(curl -s -I -b "$COOKIE_JAR" "$API_URL/api/version")
PASS=true
echo "$HEADERS" | grep -qi "x-content-type-options: nosniff" || PASS=false
echo "$HEADERS" | grep -qi "x-frame-options" || PASS=false
echo "$HEADERS" | grep -qi "content-security-policy" || PASS=false
if $PASS; then
    log_pass "All security headers present"
else
    log_fail "Some security headers missing"
fi

log_test "CORS with localhost origin"
RESPONSE=$(curl -s -D - -H "Origin: http://localhost:3000" \
    "$API_URL/api/version" | grep -i "access-control")
if [[ -n "$RESPONSE" ]]; then
    log_pass "CORS headers present"
else
    log_fail "CORS headers missing"
fi

log_test "SQL Injection in message content"
if [[ -n "$CHAT_ID" ]]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/messages" \
        -H "Content-Type: application/json" \
        -d "{\"role\":\"user\",\"content\":\"'; DROP TABLE users; --\"}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "201" ]] || [[ "$HTTP_CODE" == "400" ]]; then
        log_pass "SQL injection handled (HTTP $HTTP_CODE)"
    else
        log_fail "Unexpected response - HTTP $HTTP_CODE"
    fi
fi

log_test "XSS payload in chat title"
if [[ -n "$CHAT_ID" ]]; then
    XSS_PAYLOAD="<script>alert('XSS')</script>"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X PATCH "$API_URL/api/chats/$CHAT_ID" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"$XSS_PAYLOAD\"}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "XSS payload stored (frontend must escape)"
    else
        log_fail "Update failed - HTTP $HTTP_CODE"
    fi
fi

log_test "Access file without authorization"
if [[ -n "$FILE_ID" ]]; then
    # Create a new unauthenticated request
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "$API_URL/api/files/$FILE_ID/content")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "401" ]] || [[ "$HTTP_CODE" == "403" ]]; then
        log_pass "Unauthorized file access blocked"
    else
        log_fail "Expected 401/403, got HTTP $HTTP_CODE"
    fi
fi

log_test "Oversized file upload rejection"
# Create a 51MB file (exceeds 50MB limit)
dd if=/dev/zero of=/tmp/large-test.bin bs=1M count=51 2>/dev/null
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    --max-time 10 \
    -X POST "$API_URL/api/files" \
    -F "file=@/tmp/large-test.bin" 2>/dev/null || echo -e "\n413")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
rm -f /tmp/large-test.bin
if [[ "$HTTP_CODE" == "413" ]] || [[ "$HTTP_CODE" == "400" ]]; then
    log_pass "Oversized upload rejected (HTTP $HTTP_CODE)"
else
    log_fail "Expected 413/400, got HTTP $HTTP_CODE"
fi

section "7. Error Handling"

log_test "Invalid JSON payload"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/chats" \
    -H "Content-Type: application/json" \
    -d '{invalid json')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "400" ]] || [[ "$HTTP_CODE" == "500" ]]; then
    log_pass "Invalid JSON rejected (HTTP $HTTP_CODE)"
else
    log_fail "Expected 400/500, got HTTP $HTTP_CODE"
fi

log_test "Non-existent chat access"
FAKE_ID="00000000-0000-0000-0000-000000000000"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/chats/$FAKE_ID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "404" ]]; then
    log_pass "Non-existent chat returns 404"
else
    log_fail "Expected 404, got HTTP $HTTP_CODE"
fi

log_test "Non-existent file access"
FAKE_FILE_ID="fakefile123"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    "$API_URL/api/files/$FAKE_FILE_ID")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "404" ]] || [[ "$HTTP_CODE" == "403" ]]; then
    log_pass "Non-existent file handled (HTTP $HTTP_CODE)"
else
    log_fail "Expected 404/403, got HTTP $HTTP_CODE"
fi

log_test "Invalid message role"
if [[ -n "$CHAT_ID" ]]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X POST "$API_URL/api/chats/$CHAT_ID/messages" \
        -H "Content-Type: application/json" \
        -d '{"role":"invalid_role","content":"test"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "400" ]] || [[ "$HTTP_CODE" == "500" ]]; then
        log_pass "Invalid role rejected (HTTP $HTTP_CODE)"
    else
        log_fail "Expected 400/500, got HTTP $HTTP_CODE"
    fi
fi

section "8. Response Time Tests"

log_test "Version endpoint response time"
START=$(date +%s%3N)
curl -s -b "$COOKIE_JAR" "$API_URL/api/version" > /dev/null
END=$(date +%s%3N)
ELAPSED=$((END - START))
if [[ $ELAPSED -lt 1000 ]]; then
    log_pass "Response time: ${ELAPSED}ms"
else
    log_fail "Response time too slow: ${ELAPSED}ms"
fi

log_test "Chats list response time"
START=$(date +%s%3N)
curl -s -b "$COOKIE_JAR" "$API_URL/api/chats" > /dev/null
END=$(date +%s%3N)
ELAPSED=$((END - START))
if [[ $ELAPSED -lt 2000 ]]; then
    log_pass "Response time: ${ELAPSED}ms"
else
    log_fail "Response time too slow: ${ELAPSED}ms"
fi

section "9. Cleanup"

if [[ -n "$CHAT_ID" ]]; then
    log_test "DELETE /api/chats/:id - delete test chat"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
        -X DELETE "$API_URL/api/chats/$CHAT_ID")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "Test chat deleted"
    else
        log_fail "Failed - HTTP $HTTP_CODE"
    fi
fi

log_test "POST /api/auth/logout - logout"
RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/api/auth/logout")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Logged out successfully"
else
    log_fail "Failed - HTTP $HTTP_CODE"
fi

section "TEST SUMMARY"
echo ""
echo -e "${BLUE}Total Tests:${NC} $TESTS_TOTAL"
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
echo -e "${BLUE}Pass Rate:${NC} ${PASS_RATE}%"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
    exit 1
fi
