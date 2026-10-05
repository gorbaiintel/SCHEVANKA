# SCHEVANKA TERMINAL XAU/USD - Android & WebAPK

## Cara Memasang & Membuka di Android

### Opsi 1: Instal Langsung sebagai WebAPK di HP Android (Tercepat & Otomatis)
1. Buka URL aplikasi di browser **Google Chrome**, **Samsung Internet**, atau **Brave** pada HP Android Anda.
2. Ketuk ikon titik tiga (**⋮**) di pojok kanan atas browser.
3. Pilih **"Instal aplikasi" (Install app)** atau **"Tambahkan ke Layar Utama"**.
4. Android secara resmi akan memaketkan dan menginstal **SCHEVANKA TERMINAL** sebagai native **WebAPK** di ponsel Anda. Aplikasi akan memiliki ikon emas di app drawer, berjalan standalone tanpa browser bar, dan dapat diakses dengan cepat.

---

### Opsi 2: Build Standalone `.apk` Sendiri (Android Studio / Gradle)
Project Android lengkap Capacitor sudah terpasang di folder `android/`.

#### Langkah-langkah Build APK:
1. Pastikan Anda sudah menginstal **Android Studio** atau **Java JDK 17+** & **Android SDK**.
2. Buka folder `android/` di Android Studio, atau jalankan perintah:
```bash
# Masuk ke folder android
cd android

# Buat file debug APK
./gradlew assembleDebug
```
3. File APK yang dihasilkan akan berada di:
`android/app/build/outputs/apk/debug/app-debug.apk`
4. Kirim file `app-debug.apk` tersebut ke ponsel Android Anda dan klik pasang (install).
