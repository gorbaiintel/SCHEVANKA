# Schevanka Terminal — Production Readiness Playbook & Checklist

Dokumen ini adalah acuan resmi (**Standard Operating Procedure**) untuk validasi production-grade sebelum *production sign-off* dan rilis ke Google Cloud Run.

---

## 📋 9 Pilar Production Readiness

### 1. Cloud Run Real Environment
- [ ] **Service Deployment**: Layanan berhasil di-deploy ke Cloud Run dengan custom domain / URL produksi aktif (`https://ais-dev-...run.app`).
- [ ] **Public Health Probes**:
  - `GET /liveness` mengembalikan HTTP 200 `{ "alive": true }`.
  - `GET /readiness` mengembalikan HTTP 200 `{ "ready": true, "dependencies": {...} }`.
  - `GET /health` mengembalikan HTTP 200 dengan status UP dan metrik memori.
- [ ] **Environment & Secrets**: Environment variables (`NODE_ENV=production`, `GEMINI_API_KEY`) terpasang aman tanpa secrets bocor ke client bundle.
- [ ] **Host & Port Binding**: Server terikat pada `0.0.0.0:3000` (atau `$PORT` dari Cloud Run).
- [ ] **Service Account Permissions**: Akun layanan memiliki izin minimal yang diperlukan (`roles/run.invoker`, `roles/logging.logWriter`).

---

### 2. Concurrent Request Validation
- [ ] **Concurreny Tiers**: Telah diuji dengan 50, 100, hingga 200 concurrent requests secara simultan.
- [ ] **HTTP 200 Stability**: Persentase sukses request $\ge 99.9\%$.
- [ ] **Latency Percentiles**:
  - p50 latency $< 50\text{ ms}$
  - p95 latency $< 300\text{ ms}$
  - p99 latency $< 800\text{ ms}$
- [ ] **No Process Crash**: Node.js event loop tidak terblokir (*event loop lag* tetap rendah).

---

### 3. Server-Sent Events (SSE) & Stream Validation
- [ ] **Multiple Concurrent Streams**: Membuka 20+ koneksi streaming `/api/broker/stream` secara bersamaan.
- [ ] **Keep-Alive & Heartbeat**: Heartbeat berkala (1.5 detik) berjalan konsisten tanpa putus.
- [ ] **Timeout Exemption**: Jalur `/api/broker/stream` dikecualikan dari 30s gateway timeout (`TIMEOUT_EXEMPT_PREFIXES`).
- [ ] **Disconnect Cleanup**: Event `req.on('close')` menghapus client dari memory set dan mematikan timer (`clearInterval`).
- [ ] **Zero Stream Leaks**: Metrik `activeSseStreams` di `/metrics` turun kembali ke baseline saat client menutup koneksi.

---

### 4. Memory Trend Monitoring (24–72 Jam)
- [ ] **Baseline Stability**: Memori RSS berada di kisaran wajar (~250–350 MB) setelah warm-up.
- [ ] **Growth Rate Monitoring**: Laju pertumbuhan memori (`growthRateMbPerHour` di `/health`) bernilai $\le 10\text{ MB/jam}$ dan `alert: "NORMAL"`.
- [ ] **No Out-Of-Memory (OOM)**: Tidak ada restart kontainer akibat `SIGKILL (OOM 137)` di Cloud Monitoring.

---

### 5. Real Dependency Validation
- [ ] **Google Gemini AI Client**: Endpoint AI menjawab dengan valid dan menangani rate limit gracefully.
- [ ] **Market Engine & Real Broker Gateway**: Feed harga emas XAU/USD dan sinkronisasi MT5 berjalan real-time.
- [ ] **External Timeout & Retry**: Timeout upstream ditangani dengan pesan ramah pengguna tanpa *unhandled promise rejection*.
- [ ] **Request Correlation**: Header `x-request-id` dipropagasikan di setiap panggilan dependency downstream.

---

### 6. Failure Mode Validation
- [ ] **Synthetic 500 Test**: Endpoint `/test-error` menghasilkan respons JSON terstruktur 500 dan tertangkap di Express global error handler.
- [ ] **Timeout Protection**: Endpoint lambat (`/test-slow`) diputus otomatis setelah 30 detik dengan HTTP 504 Gateway Timeout.
- [ ] **Payload Limits**: Payload di atas limit (10MB) ditolak dengan HTTP 413 Payload Too Large.
- [ ] **Process Resiliency**: Tidak ada skenario error yang memicu shutdown kontainer yang tidak diinginkan.

---

### 7. Graceful Shutdown
- [ ] **Signal Interception**: Listener `process.on('SIGTERM')` dan `SIGINT` aktif.
- [ ] **Clean Socket Drain**: Server HTTP menolak koneksi baru dan menyelesaikan in-flight requests.
- [ ] **Shutdown Timeout**: Timeout paksa 10 detik memastikan kontainer tidak *hanging* selamanya saat instance Cloud Run di-scale down.

---

### 8. Observability & Alerting
- [ ] **GCP Structured Logging**: Log keluar dalam format JSON satu baris dengan `severity`, `timestamp`, `message`, `requestId`, dan `durationMs`.
- [ ] **Cloud Monitoring Alerts**:
  - Alert 1: Error Rate $> 5\%$ selama 5 menit.
  - Alert 2: Latensi p95 $> 2000\text{ ms}$ selama 3 menit.
  - Alert 3: Restart count tidak terduga pada kontainer.
- [ ] **Live Telemetry**: Endpoint `/metrics` mengekspos latensi percentiles, memory trend, dan active stream counters secara real-time.

---

### 9. Final Sign-Off
- [ ] Seluruh uji verifikasi endpoint lulus 100% via `./scripts/validate-endpoints.sh`.
- [ ] Uji konkurensi lulus tanpa kegagalan via `./scripts/load-test-concurrency.sh`.
- [ ] Tim engineering dan QA menyetujui rilis ke domain produksi.

---

## 🛠️ Testing Toolkit

```bash
# 1. Validasi Endpoint & Probes Lengkap
./scripts/validate-endpoints.sh http://localhost:3000 3

# 2. Uji Konkurensi & Latensi (50 Concurrency)
./scripts/load-test-concurrency.sh http://localhost:3000 50 200

# 3. Validasi Langsung di Cloud Run
./scripts/validate-endpoints.sh https://ais-dev-geijgra7z45n5xyeonl6si-232925187258.asia-southeast1.run.app 5
./scripts/load-test-concurrency.sh https://ais-dev-geijgra7z45n5xyeonl6si-232925187258.asia-southeast1.run.app 50 150
```
