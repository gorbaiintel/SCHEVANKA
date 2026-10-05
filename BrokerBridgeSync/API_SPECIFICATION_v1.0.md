# API SPECIFICATION v1.0 — Broker Bridge Webhook Sync

## 1. Base Endpoint
- **Production / Shared Endpoint**:
  `https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app/api/broker/bridge/webhook`
- **Development Endpoint**:
  `https://ais-dev-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app/api/broker/bridge/webhook`
- **Real-Time SSE Stream Endpoint**:
  `https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app/api/broker/stream`

---

## 2. Endpoints

### 2.1 `GET /api/broker/bridge/webhook` — Health & Schema Check
Returns online status, active account count, and expected payload structure.

**Response (`200 OK`):**
```json
{
  "success": true,
  "status": "online",
  "endpoint": "/api/broker/bridge/webhook",
  "allowedMethods": ["GET", "POST"],
  "activeAccountsCount": 1,
  "expectedPostPayload": {
    "loginId": "10894251 (Required - Nomor Login Akun MT4)",
    "server": "HFMarkets-LiveServer1 (Optional - Nama Server Broker)",
    "company": "HF Markets (Optional - Nama Broker)",
    "balance": 1500.0,
    "equity": 1524.5,
    "margin": 30.0,
    "freeMargin": 1494.5,
    "leverage": 500,
    "currency": "USD"
  },
  "timestamp": "2026-10-04T16:36:22.972Z"
}
```

### 2.2 `POST /api/broker/bridge/webhook` — Sync Account Telemetry
Synchronizes real-time MetaTrader 4 account balance, equity, margin, free margin, and leverage with the trading terminal and broadcasts immediately via SSE.

**Request Headers:**
- `Content-Type: application/json`

**Request Body Validation Rules:**
| Field | Type | Required | Validation Rule |
|---|---|---|---|
| `loginId` | `String` | Yes | Regex `^[0-9]{1,20}$` |
| `server` | `String` | Optional | Broker server name (e.g., `HFMarkets-LiveServer1`) |
| `company` | `String` | Optional | Broker company name (e.g., `HF Markets`) |
| `balance` | `Double` | Yes | `0.00` to `999,999,999.99` |
| `equity` | `Double` | Yes | `0.00` to `999,999,999.99` |
| `margin` | `Double` | Yes | `0.00` to `999,999,999.99` |
| `freeMargin` | `Double` | Yes | `0.00` to `999,999,999.99` |
| `leverage` | `Int` | Yes | `1` to `500` |
| `currency` | `String` | Yes | Regex `^[A-Z]{3}$` (ISO 4217, e.g., `USD`) |

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Webhook live balance synced in real-time",
  "account": {
    "loginId": "10894251",
    "server": "HFMarkets-LiveServer1",
    "company": "HF Markets",
    "balance": 1500.0,
    "equity": 1524.5,
    "margin": 30.0,
    "freeMargin": 1494.5,
    "leverage": 500,
    "currency": "USD",
    "serverPingMs": 10,
    "timestamp": "2026-10-04T16:44:24.773Z"
  }
}
```

**Error Response (`400 Bad Request`):**
```json
{
  "error": "Missing loginId"
}
```
