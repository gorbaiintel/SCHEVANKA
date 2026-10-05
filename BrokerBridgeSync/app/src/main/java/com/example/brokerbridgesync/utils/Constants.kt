package com.example.brokerbridgesync.utils

object Constants {
    const val DEFAULT_BASE_URL = "https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app"
    const val WEBHOOK_PATH = "/api/broker/bridge/webhook"
    const val DEFAULT_WEBHOOK_URL = "$DEFAULT_BASE_URL$WEBHOOK_PATH"

    const val PREFS_NAME = "broker_bridge_sync_prefs"
    const val KEY_API_URL = "api_endpoint_url"
    const val KEY_AUTO_SYNC_ENABLED = "auto_sync_enabled"
    const val KEY_AUTO_SYNC_INTERVAL_SEC = "auto_sync_interval_sec"
    const val KEY_NOTIFY_SUCCESS = "notify_on_success"
    const val KEY_NOTIFY_FAILURE = "notify_on_failure"
    const val KEY_NOTIFY_HIGH_MARGIN = "notify_high_margin"
    const val KEY_LOG_LEVEL = "log_level"

    const val DATABASE_NAME = "broker_bridge_sync.db"
    const val PAGE_SIZE = 20

    const val HIGH_MARGIN_WARNING_THRESHOLD = 80.0
    const val CRITICAL_MARGIN_THRESHOLD = 95.0

    const val CONNECT_TIMEOUT_SEC = 15L
    const val READ_TIMEOUT_SEC = 30L
    const val WRITE_TIMEOUT_SEC = 30L
}
