package com.example.brokerbridgesync.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import kotlinx.coroutines.delay

object NetworkUtils {
    fun isNetworkAvailable(context: Context): Boolean {
        val connectivityManager =
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return false
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    /**
     * Exponential backoff helper: 1s, 2s, 4s, 8s
     */
    suspend fun <T> retryWithExponentialBackoff(
        maxRetries: Int = 4,
        initialDelayMs: Long = 1000L,
        factor: Double = 2.0,
        block: suspend (attempt: Int) -> T
    ): T {
        var currentDelay = initialDelayMs
        var lastException: Throwable? = null

        for (attempt in 1..maxRetries) {
            try {
                return block(attempt)
            } catch (e: Throwable) {
                lastException = e
                if (attempt == maxRetries) break
                delay(currentDelay)
                currentDelay = (currentDelay * factor).toLong()
            }
        }
        throw lastException ?: IllegalStateException("Retry failed after $maxRetries attempts")
    }

    fun mapHttpErrorToUserMessage(statusCode: Int, serverError: String? = null): String {
        if (!serverError.isNullOrBlank()) return serverError
        return when (statusCode) {
            400 -> "HTTP 400 Bad Request: Payload tidak valid atau loginId kosong."
            401 -> "HTTP 401 Unauthorized: Kredensial atau token autentikasi ditolak oleh gateway."
            404 -> "HTTP 404 Not Found: Endpoint webhook tidak ditemukan. Periksa URL di Settings."
            500 -> "HTTP 500 Internal Server Error: Gangguan internal pada server gateway."
            503 -> "HTTP 503 Service Unavailable: Server sedang sibuk atau dalam pemeliharaan."
            else -> "HTTP $statusCode: Gagal melakukan sinkronisasi dengan server."
        }
    }
}
