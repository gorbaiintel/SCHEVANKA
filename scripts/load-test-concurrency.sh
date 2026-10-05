#!/usr/bin/env bash

# ==============================================================================
# Schevanka Terminal - Concurrent Load & Stress Testing Script
# ==============================================================================
# Usage:
#   ./scripts/load-test-concurrency.sh [TARGET_URL] [CONCURRENCY] [TOTAL_REQUESTS]
# Examples:
#   ./scripts/load-test-concurrency.sh
#   ./scripts/load-test-concurrency.sh http://localhost:3000 50 150
#   ./scripts/load-test-concurrency.sh http://localhost:3000 100 300
#   ./scripts/load-test-concurrency.sh https://ais-dev-xxx.run.app 50 200
# ==============================================================================

set -u

TARGET_URL="${1:-http://localhost:3000}"
CONCURRENCY="${2:-50}"
TOTAL_REQUESTS="${3:-100}"

TARGET_URL="${TARGET_URL%/}"

# Colors
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_GREEN='\033[32m'
C_RED='\033[31m'
C_YELLOW='\033[33m'
C_CYAN='\033[36m'
C_BLUE='\033[34m'
C_MAGENTA='\033[35m'

echo -e "${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}  SCHEVANKA TERMINAL - CONCURRENT LOAD TEST SUITE${C_RESET}"
echo -e "${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "Target URL      : ${C_BOLD}${C_YELLOW}${TARGET_URL}${C_RESET}"
echo -e "Concurrency     : ${C_BOLD}${CONCURRENCY} simultaneous workers${C_RESET}"
echo -e "Total Requests  : ${C_BOLD}${TOTAL_REQUESTS}${C_RESET}"
echo -e "Test Timestamp  : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo -e "${C_BLUE}------------------------------------------------------------------------------${C_RESET}"

# Pre-test Telemetry
echo -e "${C_BOLD}${C_MAGENTA}[1/3] Capturing Pre-Test Telemetry Baseline...${C_RESET}"
PRE_METRICS=$(curl -s --max-time 5 "${TARGET_URL}/metrics" 2>/dev/null || echo "")
if [ -n "$PRE_METRICS" ]; then
  PRE_RSS=$(echo "$PRE_METRICS" | sed -n 's/.*"rssMb":\([0-9.]*\).*/\1/p')
  PRE_HEAP=$(echo "$PRE_METRICS" | sed -n 's/.*"heapUsedMb":\([0-9.]*\).*/\1/p')
  echo -e "  Baseline Memory : RSS: ${PRE_RSS:-N/A}MB | Heap: ${PRE_HEAP:-N/A}MB"
else
  echo -e "  ${C_YELLOW}⚠ Warning: Target metrics endpoint not responding yet.${C_RESET}"
fi

RESULTS_DIR=$(mktemp -d)
trap 'rm -rf "$RESULTS_DIR"' EXIT

echo -e "\n${C_BOLD}${C_MAGENTA}[2/3] Firing ${TOTAL_REQUESTS} requests across ${CONCURRENCY} concurrent workers...${C_RESET}"
START_EPOCH=$(date +%s%N)

seq 1 "$TOTAL_REQUESTS" | xargs -P "$CONCURRENCY" -I {} bash -c '
  TARGET="$1"
  DIR="$2"
  ID="$3"
  REQ_ID="load-worker-${ID}-$(date +%s%N | cut -b10-16)"
  
  # Cycle across core production endpoints
  ENDPOINT="/health"
  MOD=$(( ID % 3 ))
  if [ "$MOD" -eq 1 ]; then
    ENDPOINT="/metrics"
  elif [ "$MOD" -eq 2 ]; then
    ENDPOINT="/liveness"
  fi

  RESULT=$(curl -s -S --max-time 15 -o /dev/null -w "%{http_code} %{time_total}" -H "x-request-id: ${REQ_ID}" "${TARGET}${ENDPOINT}" 2>/dev/null || echo "000 0")
  echo "$RESULT" > "${DIR}/${ID}.res"
' _ "$TARGET_URL" "$RESULTS_DIR" "{}"

END_EPOCH=$(date +%s%N)
TOTAL_TIME_MS=$(( (END_EPOCH - START_EPOCH) / 1000000 ))
TOTAL_TIME_SEC=$(awk -v ms="$TOTAL_TIME_MS" 'BEGIN { printf "%.2f", ms / 1000 }')

echo -e "${C_GREEN}  ✔ All requests completed in ${TOTAL_TIME_SEC}s${C_RESET}"

# Aggregate Results
SUCCESS_COUNT=0
FAILED_COUNT=0
TOTAL_LATENCY_MS=0
MIN_LATENCY_MS=999999
MAX_LATENCY_MS=0

for res_file in "$RESULTS_DIR"/*.res; do
  [ -f "$res_file" ] || continue
  read -r code time_sec < "$res_file"
  time_ms=$(awk -v t="$time_sec" 'BEGIN { printf "%d", t * 1000 }')

  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi

  TOTAL_LATENCY_MS=$((TOTAL_LATENCY_MS + time_ms))
  if [ "$time_ms" -lt "$MIN_LATENCY_MS" ]; then
    MIN_LATENCY_MS="$time_ms"
  fi
  if [ "$time_ms" -gt "$MAX_LATENCY_MS" ]; then
    MAX_LATENCY_MS="$time_ms"
  fi
done

TOTAL_PROCESSED=$((SUCCESS_COUNT + FAILED_COUNT))
if [ "$TOTAL_PROCESSED" -gt 0 ]; then
  AVG_LATENCY_MS=$((TOTAL_LATENCY_MS / TOTAL_PROCESSED))
  RPS=$(awk -v n="$TOTAL_PROCESSED" -v s="$TOTAL_TIME_SEC" 'BEGIN { if (s > 0) printf "%.1f", n / s; else printf "0" }')
  SUCCESS_RATE=$(awk -v s="$SUCCESS_COUNT" -v t="$TOTAL_PROCESSED" 'BEGIN { printf "%.1f", (s / t) * 100 }')
else
  AVG_LATENCY_MS=0
  RPS=0
  SUCCESS_RATE=0
fi

# Post-test Telemetry
echo -e "\n${C_BOLD}${C_MAGENTA}[3/3] Inspecting Post-Test Server Health & Memory...${C_RESET}"
POST_METRICS=$(curl -s --max-time 5 "${TARGET_URL}/metrics" 2>/dev/null || echo "")
if [ -n "$POST_METRICS" ]; then
  POST_RSS=$(echo "$POST_METRICS" | sed -n 's/.*"rssMb":\([0-9.]*\).*/\1/p')
  POST_HEAP=$(echo "$POST_METRICS" | sed -n 's/.*"heapUsedMb":\([0-9.]*\).*/\1/p')
  GROWTH_ALERT=$(echo "$POST_METRICS" | sed -n 's/.*"alert":"\([^"]*\)".*/\1/p')
  echo -e "  Post-Load Memory: RSS: ${POST_RSS:-N/A}MB | Heap: ${POST_HEAP:-N/A}MB | Leak Alert: ${GROWTH_ALERT:-NORMAL}"
fi

echo -e "\n${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "${C_BOLD}CONCURRENCY LOAD TEST RESULTS:${C_RESET}"
echo -e "  Total Requests  : ${TOTAL_PROCESSED}"
echo -e "  Successful (2xx): ${C_GREEN}${SUCCESS_COUNT}${C_RESET} (${SUCCESS_RATE}%)"
echo -e "  Failed Requests : ${FAILED_COUNT}"
echo -e "  Throughput      : ${C_BOLD}${C_CYAN}${RPS} req/sec${C_RESET}"
echo -e "  Min Latency     : ${MIN_LATENCY_MS} ms"
echo -e "  Avg Latency     : ${C_BOLD}${AVG_LATENCY_MS} ms${C_RESET}"
echo -e "  Max Latency     : ${MAX_LATENCY_MS} ms"

if [ "$FAILED_COUNT" -eq 0 ] && [ "$TOTAL_PROCESSED" -gt 0 ]; then
  echo -e "\n${C_BOLD}${C_GREEN}🎉 CONCURRENCY TEST PASSED! ZERO CRASHES OR DROPPED REQUESTS.${C_RESET}"
  exit 0
else
  echo -e "\n${C_BOLD}${C_RED}❌ CONCURRENCY TEST FAILED: ${FAILED_COUNT} REQUESTS ENCOUNTERED ERRORS.${C_RESET}"
  exit 1
fi
