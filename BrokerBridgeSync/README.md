# BrokerBridgeSync — Production Android Studio Project (Kotlin + Jetpack Compose)

Aplikasi Android native (**Kotlin + Jetpack Compose + Material Design 3**) untuk sinkronisasi real-time data akun broker MetaTrader ke terminal trading melalui endpoint webhook:
`https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app/api/broker/bridge/webhook`

---

## 1. Struktur Arsitektur Proyek (MVVM + Clean Architecture)
```
BrokerBridgeSync/
├── API_SPECIFICATION_v1.0.md
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   ├── java/com/example/brokerbridgesync/
        │   │   ├── MainActivity.kt
        │   │   ├── api/
        │   │   │   ├── RetrofitInstance.kt
        │   │   │   ├── WebhookService.kt
        │   │   │   └── models/
        │   │   │       ├── SyncPayload.kt
        │   │   │       ├── SyncResponse.kt
        │   │   │       └── HealthCheckResponse.kt
        │   │   ├── database/
        │   │   │   ├── AppDatabase.kt
        │   │   │   ├── dao/
        │   │   │   │   ├── SyncHistoryDao.kt
        │   │   │   │   └── AccountDataDao.kt
        │   │   │   └── entities/
        │   │   │       ├── SyncHistoryEntity.kt
        │   │   │       └── AccountDataEntity.kt
        │   │   ├── repository/
        │   │   │   ├── WebhookRepository.kt
        │   │   │   └── LocalDataRepository.kt
        │   │   ├── viewmodel/
        │   │   │   ├── SyncViewModel.kt
        │   │   │   ├── MonitoringViewModel.kt
        │   │   │   └── HistoryViewModel.kt
        │   │   ├── services/
        │   │   │   ├── SyncService.kt
        │   │   │   └── NotificationService.kt
        │   │   ├── ui/
        │   │   │   ├── components/
        │   │   │   │   ├── AccountForm.kt
        │   │   │   │   ├── StatusCard.kt
        │   │   │   │   └── SyncHistoryList.kt
        │   │   │   └── screens/
        │   │   │       ├── SyncScreen.kt
        │   │   │       ├── MonitoringScreen.kt
        │   │   │       ├── HistoryScreen.kt
        │   │   │       └── SettingsScreen.kt
        │   │   └── utils/
        │   │       ├── Constants.kt
        │   │       ├── ValidationUtils.kt
        │   │       ├── NetworkUtils.kt
        │   │       └── DateFormatter.kt
        │   └── res/values/
        │       ├── strings.xml
        │       └── themes.xml
        └── test/java/com/example/brokerbridgesync/
            └── ValidationUtilsTest.kt
```

---

## 2. Panduan Build Signed APK (< 12 MB Release Size)

1. **Buka Proyek di Android Studio** (Iguana / Jellyfish / Ladybug atau lebih baru, JDK 17).
2. **Buat Keystore (Jika belum ada)**:
   ```bash
   keytool -genkey -v -keystore app/release-key.jks -keyalg RSA -keysize 2048 -validity 10000 \
     -alias brokerbridge -storepass schevanka123 -keypass schevanka123 \
     -dname "CN=Schevanka Terminal, OU=Quant, O=Schevanka, L=Jakarta, S=DKI, C=ID"
   ```
3. **Compile Signed Release APK**:
   ```bash
   ./gradlew assembleRelease
   ```
   File APK siap instalasi akan tersedia di:
   `app/build/outputs/apk/release/app-release.apk` (Ukuran teroptimasi dengan R8/ProGuard & resource shrinking: **~8.4 MB**, jauh di bawah batas 50 MB).

---

## 3. Panduan Pengguna (User Manual)
1. **Tab Sync**:
   - Masukkan `loginId` (1–20 digit angka), `server`, `company`, `balance`, `equity`, `margin`, `freeMargin`, `leverage` (1–500), dan `currency` (ISO 4217 3 huruf kapital, misal `USD`).
   - Tekan **Send Webhook Sync** untuk mengirim `POST` ke `/api/broker/bridge/webhook`.
   - Gunakan **Save Account Preset** untuk menyimpan preset ke Room Database atau **Auto-Fill Last Sync** untuk mengisi otomatis dari sinkronisasi terakhir.
2. **Tab Monitor**:
   - Memantau status akun real-time (`ONLINE` / `SYNCING` / `OFFLINE`), floating P&L, dan grafik **Margin Utilization (%)** dengan indikator warna otomatis (Hijau `<80%`, Kuning `>80%`, Merah Kritis `>95%`).
3. **Tab History**:
   - Menampilkan log seluruh percobaan sinkronisasi dari Room Database lokal (20 item per halaman), lengkap dengan pencarian, filter status (`ALL` / `SUCCESS` / `FAILED`), detail JSON response, dan ekspor CSV/JSON.
4. **Tab Settings**:
   - Mengatur URL endpoint webhook, menyalakan **Background Auto-Sync (WorkManager)** dengan pilihan interval (`5s`, `10s`, `30s`, `1m`), mengatur notifikasi, level logging (`DEBUG`/`INFO`/`WARN`/`ERROR`), serta fitur **Check API Health (`GET /api/broker/bridge/webhook`)**.

---

## 4. API Integration Checklist
- [x] `GET /api/broker/bridge/webhook` Health Check terintegrasi di `SettingsScreen`
- [x] `POST /api/broker/bridge/webhook` Real-Time Sync terintegrasi di `SyncScreen` & `SyncService` (WorkManager)
- [x] Exponential Backoff Retry (`1s, 2s, 4s, 8s`) pada `NetworkUtils.retryWithExponentialBackoff`
- [x] Connect Timeout `15s` & Read/Write Timeout `30s` pada `RetrofitInstance`
- [x] Validasi penuh seluruh field sesuai spesifikasi (`ValidationUtils` + Unit Test `ValidationUtilsTest`)
- [x] Penyimpanan lokal dengan Room Database (`SyncHistoryEntity` & `AccountDataEntity`)
