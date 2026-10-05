#!/usr/bin/env bash

# ==============================================================================
# Schevanka Terminal - Endpoint & Cloud Run Production Validation Suite
# ==============================================================================
# Usage:
#   ./scripts/validate-endpoints.sh [BASE_URL] [ITERATIONS] [TIMEOUT]
# Examples:
#   ./scripts/validate-endpoints.sh
#   ./scripts/validate-endpoints.sh http://localhost:3000
#   ./scripts/validate-endpoints.sh http://localhost:3000 10
#   ./scripts/validate-endpoints.sh https://ais-dev-xxx.run.app 5
#   ./scripts/validate-endpoints.sh http://localhost:3000 3 60
# ==============================================================================

set -u

BASE_URL="${1:-http://localhost:3000}"
ITERATIONS="${2:-1}"
TIMEOUT="${3:-30}"

# Normalize BASE_URL (remove trailing slash)
BASE_URL="${BASE_URL%/}"

# Terminal Colors
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_GREEN='\033[32m'
C_RED='\033[31m'
C_YELLOW='\033[33m'
C_CYAN='\033[36m'
C_BLUE='\033[34m'
C_MAGENTA='\033[35m'

echo -e "${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}  SCHEVANKA TERMINAL - PRODUCTION ENDPOINT VALIDATOR${C_RESET}"
echo -e "${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "Target URL  : ${C_BOLD}${C_YELLOW}${BASE_URL}${C_RESET}"
echo -e "Iterations  : ${C_BOLD}${ITERATIONS}${C_RESET}"
echo -e "Timeout     : ${C_BOLD}${TIMEOUT}s${C_RESET}"
echo -e "Timestamp   : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo -e "${C_BLUE}------------------------------------------------------------------------------${C_RESET}"

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
  local test_name="$1"
  local url="$2"
  local expected_code="$3"
  local match_pattern="${4:-}"
  local custom_header="${5:-}"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  local header_args=()
  if [ -n "$custom_header" ]; then
    header_args=(-H "$custom_header")
  fi

  local response_file
  response_file=$(mktemp)
  local headers_file
  headers_file=$(mktemp)

  local http_code
  http_code=$(curl -s -S --max-time "$TIMEOUT" -D "$headers_file" -o "$response_file" -w "%{http_code}" "${header_args[@]}" "$url" 2>/dev/null || echo "000")
  local body
  body=$(cat "$response_file" 2>/dev/null || echo "")

  rm -f "$response_file" "$headers_file"

  if [ "$http_code" -eq "$expected_code" ]; then
    if [ -n "$match_pattern" ]; then
      if echo "$body" | grep -q "$match_pattern"; then
        echo -e "  [${C_GREEN}PASS${C_RESET}] ${test_name} (HTTP ${http_code}) - Verified content"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
      else
        echo -e "  [${C_RED}FAIL${C_RESET}] ${test_name} (HTTP ${http_code}) - Expected pattern '${match_pattern}' not found in body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
      fi
    else
      echo -e "  [${C_GREEN}PASS${C_RESET}] ${test_name} (HTTP ${http_code})"
      PASSED_TESTS=$((PASSED_TESTS + 1))
      return 0
    fi
  else
    echo -e "  [${C_RED}FAIL${C_RESET}] ${test_name} (Got HTTP ${http_code}, Expected ${expected_code})"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

test_request_id_correlation() {
  local test_req_id="test-req-$(date +%s)-$RANDOM"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  local response_headers
  response_headers=$(curl -s -S --max-time "$TIMEOUT" -I -H "x-request-id: ${test_req_id}" "${BASE_URL}/metrics" 2>/dev/null || echo "")

  if echo "$response_headers" | grep -i -q "x-request-id:.*${test_req_id}"; then
    echo -e "  [${C_GREEN}PASS${C_RESET}] Request ID Propagation (x-request-id matched: ${test_req_id})"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "  [${C_RED}FAIL${C_RESET}] Request ID Propagation - Header not echoed in response"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# Execute Test Iterations
for iter in $(seq 1 "$ITERATIONS"); do
  if [ "$ITERATIONS" -gt 1 ]; then
    echo -e "\n${C_BOLD}${C_MAGENTA}--- Iteration ${iter}/${ITERATIONS} ---${C_RESET}"
  else
    echo -e "\n${C_BOLD}${C_MAGENTA}--- Running Health & Telemetry Probes ---${C_RESET}"
  fi

  # 1. Liveness Probe
  run_test "Liveness Probe (/liveness)" "${BASE_URL}/liveness" 200 '"alive":true'

  # 2. Readiness Probe
  run_test "Readiness Probe (/readiness)" "${BASE_URL}/readiness" 200 '"ready":true'

  # 3. Comprehensive Health Endpoint
  run_test "Health Check (/health)" "${BASE_URL}/health" 200 '"status":"UP"'

  # 4. Metrics & Telemetry
  run_test "Telemetry & Metrics (/metrics)" "${BASE_URL}/metrics" 200 '"schevanka-terminal"'

  # 5. Request Correlation ID Tracking
  test_request_id_correlation

  # 6. Global Error Middleware Verification (simulated test error should return 500 cleanly without crashing)
  run_test "Error Handler Middleware (/test-error)" "${BASE_URL}/test-error" 500 '"error":"Internal Server Error"'

  # Print current telemetry stats if available
  METRICS_JSON=$(curl -s --max-time 5 "${BASE_URL}/metrics" 2>/dev/null || echo "")
  if [ -n "$METRICS_JSON" ]; then
    RSS_MB=$(echo "$METRICS_JSON" | sed -n 's/.*"rssMb":\([0-9.]*\).*/\1/p')
    HEAP_MB=$(echo "$METRICS_JSON" | sed -n 's/.*"heapUsedMb":\([0-9.]*\).*/\1/p')
    SSE_COUNT=$(echo "$METRICS_JSON" | sed -n 's/.*"activeSseStreams":\([0-9]*\).*/\1/p')
    if [ -n "$RSS_MB" ]; then
      echo -e "  ${C_CYAN}ℹ Telemetry:${C_RESET} RSS: ${RSS_MB}MB | Heap: ${HEAP_MB}MB | Active SSE: ${SSE_COUNT}"
    fi
  fi
done

echo -e "\n${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "${C_BOLD}VALIDATION SUMMARY:${C_RESET}"
echo -e "  Total Tests   : ${TOTAL_TESTS}"
echo -e "  Passed        : ${C_GREEN}${PASSED_TESTS}${C_RESET}"
echo -e "  Failed        : ${C_RED}${FAILED_TESTS}${C_RESET}"

if [ "$FAILED_TESTS" -eq 0 ]; then
  echo -e "\n${C_BOLD}${C_GREEN}🎉 ALL ENDPOINTS VALIDATED SUCCESSFULLY! (PRODUCTION READY)${C_RESET}"
  exit 0
else
  echo -e "\n${C_BOLD}${C_RED}❌ VALIDATION FAILED WITH ${FAILED_TESTS} ERROR(S)${C_RESET}"
  exit 1
fi
