#!/usr/bin/env bash

# ==============================================================================
# Schevanka Terminal - SSE & Broker Stream Stability Validation Suite
# ==============================================================================
# Usage:
#   ./scripts/test-sse-stability.sh [BASE_URL] [CONCURRENT_STREAMS] [STREAM_DURATION_SEC]
# ==============================================================================

set -u

BASE_URL="${1:-http://localhost:3000}"
CONCURRENT_STREAMS="${2:-5}"
DURATION="${3:-6}"

BASE_URL="${BASE_URL%/}"

C_RESET='\033[0m'
C_BOLD='\033[1m'
C_GREEN='\033[32m'
C_RED='\033[31m'
C_YELLOW='\033[33m'
C_CYAN='\033[36m'
C_BLUE='\033[34m'
C_MAGENTA='\033[35m'

echo -e "${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}  SCHEVANKA TERMINAL - SSE STREAM STABILITY VALIDATOR${C_RESET}"
echo -e "${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "Target URL          : ${C_BOLD}${C_YELLOW}${BASE_URL}${C_RESET}"
echo -e "Concurrent Streams  : ${C_BOLD}${CONCURRENT_STREAMS}${C_RESET}"
echo -e "Stream Hold Duration: ${C_BOLD}${DURATION}s${C_RESET}"
echo -e "Timestamp           : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo -e "${C_BLUE}------------------------------------------------------------------------------${C_RESET}"

# 1. Baseline Active Streams
echo -e "${C_BOLD}${C_MAGENTA}[1/4] Checking Initial Active Stream Count...${C_RESET}"
INITIAL_METRICS=$(curl -s --max-time 5 "${BASE_URL}/metrics" 2>/dev/null || echo "")
INITIAL_COUNT=$(echo "$INITIAL_METRICS" | sed -n 's/.*"activeSseStreams":\([0-9]*\).*/\1/p')
INITIAL_COUNT="${INITIAL_COUNT:-0}"
echo -e "  Initial active streams: ${C_BOLD}${INITIAL_COUNT}${C_RESET}"

# 2. Spawning Concurrent SSE Connections
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo -e "\n${C_BOLD}${C_MAGENTA}[2/4] Opening ${CONCURRENT_STREAMS} Concurrent SSE Streams (${DURATION}s)...${C_RESET}"
PIDS=()
for i in $(seq 1 "$CONCURRENT_STREAMS"); do
  OUT_FILE="${TEMP_DIR}/stream_${i}.log"
  curl -s -N --max-time "$DURATION" "${BASE_URL}/api/broker/stream?loginId=test_acc_${i}" > "$OUT_FILE" 2>&1 &
  PIDS+=($!)
done

# Wait 2.5 seconds to let connections register
sleep 2.5

# 3. Verify Active Streams Count During Streaming
PEAK_METRICS=$(curl -s --max-time 5 "${BASE_URL}/metrics" 2>/dev/null || echo "")
PEAK_COUNT=$(echo "$PEAK_METRICS" | sed -n 's/.*"activeSseStreams":\([0-9]*\).*/\1/p')
PEAK_COUNT="${PEAK_COUNT:-0}"
EXPECTED_MIN=$(( INITIAL_COUNT + CONCURRENT_STREAMS ))

echo -e "  Observed active streams under load: ${C_BOLD}${PEAK_COUNT}${C_RESET} (Expected >= ${EXPECTED_MIN})"

# Wait for client curls to complete
for pid in "${PIDS[@]}"; do
  wait "$pid" 2>/dev/null || true
done

# Brief grace period for server req.on('close') event emission
sleep 1.5

# 4. Verify Disconnect & Resource Cleanup
echo -e "\n${C_BOLD}${C_MAGENTA}[3/4] Verifying Stream Disconnect & Memory Cleanup...${C_RESET}"
FINAL_METRICS=$(curl -s --max-time 5 "${BASE_URL}/metrics" 2>/dev/null || echo "")
FINAL_COUNT=$(echo "$FINAL_METRICS" | sed -n 's/.*"activeSseStreams":\([0-9]*\).*/\1/p')
FINAL_COUNT="${FINAL_COUNT:-0}"
echo -e "  Final active streams after disconnect: ${C_BOLD}${FINAL_COUNT}${C_RESET} (Initial baseline: ${INITIAL_COUNT})"

# 5. Inspect Data Frames Received
echo -e "\n${C_BOLD}${C_MAGENTA}[4/4] Validating SSE Heartbeat & Payload Frames...${C_RESET}"
FRAMES_VALIDATED=0
for i in $(seq 1 "$CONCURRENT_STREAMS"); do
  OUT_FILE="${TEMP_DIR}/stream_${i}.log"
  if [ -f "$OUT_FILE" ] && grep -q "data:" "$OUT_FILE"; then
    FRAMES_VALIDATED=$((FRAMES_VALIDATED + 1))
  fi
done

echo -e "  Streams with valid data frames: ${C_BOLD}${FRAMES_VALIDATED}/${CONCURRENT_STREAMS}${C_RESET}"

echo -e "\n${C_BOLD}${C_BLUE}==============================================================================${C_RESET}"
echo -e "${C_BOLD}SSE STREAM STABILITY SUMMARY:${C_RESET}"

STREAM_LEAK=$(( FINAL_COUNT - INITIAL_COUNT ))

if [ "$FRAMES_VALIDATED" -eq "$CONCURRENT_STREAMS" ] && [ "$STREAM_LEAK" -le 0 ]; then
  echo -e "  [${C_GREEN}PASS${C_RESET}] Heartbeat stream delivery: 100% (${FRAMES_VALIDATED}/${CONCURRENT_STREAMS})"
  echo -e "  [${C_GREEN}PASS${C_RESET}] Connection leak check: 0 leaked streams detected"
  echo -e "\n${C_BOLD}${C_GREEN}🎉 SSE STREAM STABILITY VALIDATED! CLEANUP & ZERO LEAKS CONFIRMED.${C_RESET}"
  exit 0
else
  echo -e "  [${C_RED}FAIL${C_RESET}] Stream delivery or leak detected (Leaked streams: ${STREAM_LEAK})"
  echo -e "\n${C_BOLD}${C_RED}❌ SSE STREAM STABILITY CHECK FAILED.${C_RESET}"
  exit 1
fi
