package com.example.brokerbridgesync.utils

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object DateFormatter {
    private val fullFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
    private val shortTimeFormat = SimpleDateFormat("HH:mm:ss", Locale.US)

    fun formatTimestamp(epochMillis: Long): String {
        if (epochMillis <= 0L) return "-"
        return fullFormat.format(Date(epochMillis))
    }

    fun formatShortTime(epochMillis: Long): String {
        if (epochMillis <= 0L) return "-"
        return shortTimeFormat.format(Date(epochMillis))
    }
}
