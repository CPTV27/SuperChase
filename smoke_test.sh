#!/bin/bash
#
# SuperChase Smoke Test
# Verifies all API connections before running triage
#

set -e

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════╗"
echo "║     SuperChase v2 Smoke Test             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

# Test 1: Gemini Hub
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Gemini Hub (core/hub.js)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node -e "
import hub from './core/hub.js';
const result = await hub.testConnection();
console.log(result.success ? '✓ Gemini API connected' : '✗ Gemini API failed');
console.log('  Model:', result.model || 'N/A');
console.log('  Response:', result.response || result.error);
process.exit(result.success ? 0 : 1);
" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

echo ""

# Test 2: Gmail
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Gmail OAuth (spokes/gmail)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node spokes/gmail/test_connection.js > /dev/null 2>&1 && {
    echo "✓ Gmail API connected"
    PASS=$((PASS+1))
} || {
    echo "✗ Gmail API failed"
    node spokes/gmail/test_connection.js 2>&1 | grep -E "(FAIL|Error)" | head -2
    FAIL=$((FAIL+1))
}

echo ""

# Test 3: Asana
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Asana API (spokes/asana)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node spokes/asana/test_connection.js > /dev/null 2>&1 && {
    echo "✓ Asana API connected"
    PASS=$((PASS+1))
} || {
    echo "✗ Asana API failed"
    node spokes/asana/test_connection.js 2>&1 | grep -E "(FAIL|Error)" | head -2
    FAIL=$((FAIL+1))
}

echo ""

# Summary
echo "╔══════════════════════════════════════════╗"
echo "║               RESULTS                    ║"
echo "╠══════════════════════════════════════════╣"
printf "║  Passed: %-3s  Failed: %-3s              ║\n" "$PASS" "$FAIL"
echo "╚══════════════════════════════════════════╝"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✓ All smoke tests passed! Ready for triage."
    echo ""
    echo "Run: npm run triage"
    exit 0
else
    echo "✗ Some tests failed. Fix issues before proceeding."
    exit 1
fi
