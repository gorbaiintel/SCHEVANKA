# Schevanka Terminal — Pre-Production Security & Privacy Audit Report

Laporan ini memverifikasi postur keamanan, proteksi data, kontrol akses, dan pembatasan laju (*rate limiting*) sebelum link aplikasi dibagikan ke tim produk atau pengguna eksternal.

---

## 🔒 1. Security & Access Control Analysis

### Perbedaan URL Lingkungan:
- **`ais-dev-...run.app` (Development Preview):**
  - **Status Akses**: **RESTRICTED / BUKAN PUBLIC**.
  - **Mekanisme Proteksi**: Terkunci di balik *Google AI Studio Auth Cookie Gate* (`__SECURE-aistudio_auth_flow_may_set_cookies`).
  - Request unauthenticated dari luar browser pemilik akun secara otomatis menerima **HTTP 302** dan dialihkan ke `/__cookie_check.html`.
  - Content Security Policy (CSP): `frame-ancestors 'self' https://*.google.com`.
- **`ais-pre-...run.app` (Shared App URL):**
  - URL resmi yang di-generate oleh Google AI Studio jika pengguna memilih untuk membagikan aplikasi (*Share/Publish*) kepada tim penguji atau reviewer.

---

## 🛡️ 2. Data Privacy & Secret Sanitization Audit

Hasil audit kode pada seluruh respons API server:

| Endpoint | Data yang Dikembalikan | Sanitasi Rahasia | Status |
|---|---|---|:---:|
| `GET /health` | Status UP, uptime, memori RSS/Heap, status koneksi dependency | Tidak ada API key, token, atau IP internal | ✅ **PASS** |
| `GET /readiness` | Boolean `geminiApiKeyConfigured: true` (hanya flag boolean) | Nilai string `GEMINI_API_KEY` tidak pernah diekspos | ✅ **PASS** |
| `GET /metrics` | Latensi percentiles, snapshot alokasi memori, active SSE count | Data murni telemetri runtime internal | ✅ **PASS** |
| `POST /api/broker/connect` | `balance`, `equity`, `margin`, `leverage`, `isVerifiedReal` | `metaApiToken`, `oandaToken`, dan password akun broker **dibuang dari payload response** dan hanya disimpan privat di in-memory store | ✅ **PASS** |
| `GET /api/gold-headlines` | Rangkuman sentimen pasar, item berita, tautan berita publik | Grounding sources hanya memuat URL publik (Reuters, Bloomberg, dll.) | ✅ **PASS** |

---

## ⚡ 3. Rate Limiting & DoS Protection (Active)

Middleware proteksi DoS aktif pada seluruh endpoint `/api/*`:
- **Limit**: **120 request per menit per alamat IP** (`X-RateLimit-Limit: 120`).
- **Response Headers**:
  - `X-RateLimit-Limit`: Jumlah maksimum request per window.
  - `X-RateLimit-Remaining`: Sisa kuota request sebelum dibatasi.
  - `X-RateLimit-Reset`: Timestamp reset window kuota (Epoch seconds).
  - `Retry-After`: Estimasi detik tunggu jika terkena status HTTP 429.
- **Exemption**: Probe statis (`/health`, `/liveness`, `/readiness`, `/metrics`) dan stream SSE kontinu dikecualikan agar tidak mengganggu monitoring Cloud Run.

---

## 📦 4. Request Payload Size Bounds

- `express.json({ limit: '10mb' })`
- `express.urlencoded({ extended: true, limit: '10mb' })`
- Permintaan dengan payload melebihi 10MB langsung ditolak secara aman dengan HTTP 413 (*Payload Too Large*), melindungi container dari serangan *Memory Exhaustion*.

---

## 📋 Rekomendasi Saat Berbagi ke Tim Produk

1. **Gunakan URL Shared Resmi**:
   Gunakan **Shared App URL** (`https://ais-pre-geijgra7z45n5xyeonl6si-232925187258.asia-southeast1.run.app`) untuk akses tim produk.
2. **Jangan Bagikan `ais-dev-...` Tanpa Login**:
   URL `ais-dev-...` akan meminta login Google akun pembuat karena proteksi IAM aktif secara default.
3. **Kredensial Broker Tetap Aman**:
   Kredensial atau token API MetaTrader/OANDA yang diinput pengguna dienkapsulasi pada sisi server dan tidak pernah di-echo balik ke browser.
