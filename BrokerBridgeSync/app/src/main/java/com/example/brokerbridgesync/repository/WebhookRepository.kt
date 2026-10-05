package com.example.brokerbridgesync.repository

import com.example.brokerbridgesync.api.RetrofitInstance
import com.example.brokerbridgesync.api.models.HealthCheckResponse
import com.example.brokerbridgesync.api.models.SyncPayload
import com.example.brokerbridgesync.api.models.SyncResponse
import com.example.brokerbridgesync.utils.Constants
import com.example.brokerbridgesync.utils.NetworkUtils
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.SocketTimeoutException

data class WebhookSyncOutcome(
    val isSuccess: Boolean,
    val statusCode: Int?,
    val responseTimeMs: Long,
    val message: String,
    val rawResponseJson: String?,
    val response: SyncResponse? = null,
    val isTimeout: Boolean = false
)

class WebhookRepository {
    private val gson = Gson()

    suspend fun checkHealth(endpointUrl: String = Constants.DEFAULT_WEBHOOK_URL): Result<HealthCheckResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = RetrofitInstance.api.getHealthStatusByUrl(endpointUrl)
                val body = response.body()
                if (response.isSuccessful && body != null) {
                    Result.success(body)
                } else {
                    Result.failure(
                        Exception(NetworkUtils.mapHttpErrorToUserMessage(response.code()))
                    )
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun syncAccount(
        payload: SyncPayload,
        endpointUrl: String = Constants.DEFAULT_WEBHOOK_URL
    ): WebhookSyncOutcome = withContext(Dispatchers.IO) {
        val startMs = System.currentTimeMillis()
        try {
            val response = NetworkUtils.retryWithExponentialBackoff(
                maxRetries = 4,
                initialDelayMs = 1000L
            ) {
                RetrofitInstance.api.syncAccountDataByUrl(endpointUrl, payload)
            }

            val elapsedMs = (System.currentTimeMillis() - startMs).coerceAtLeast(1L)
            val statusCode = response.code()
            val body = response.body()
            val errorBodyStr = response.errorBody()?.string()

            if (response.isSuccessful && body != null && body.success) {
                val rawJson = gson.toJson(body)
                WebhookSyncOutcome(
                    isSuccess = true,
                    statusCode = statusCode,
                    responseTimeMs = elapsedMs,
                    message = body.message ?: "Webhook live balance synced in real-time",
                    rawResponseJson = rawJson,
                    response = body
                )
            } else {
                val errMsg = NetworkUtils.mapHttpErrorToUserMessage(
                    statusCode = statusCode,
                    serverError = body?.error
                )
                WebhookSyncOutcome(
                    isSuccess = false,
                    statusCode = statusCode,
                    responseTimeMs = elapsedMs,
                    message = errMsg,
                    rawResponseJson = errorBodyStr ?: gson.toJson(body)
                )
            }
        } catch (timeout: SocketTimeoutException) {
            val elapsedMs = (System.currentTimeMillis() - startMs).coerceAtLeast(1L)
            WebhookSyncOutcome(
                isSuccess = false,
                statusCode = null,
                responseTimeMs = elapsedMs,
                message = "Request Timeout (30s): Koneksi ke server terlalu lambat atau terputus.",
                rawResponseJson = null,
                isTimeout = true
            )
        } catch (e: Throwable) {
            val elapsedMs = (System.currentTimeMillis() - startMs).coerceAtLeast(1L)
            WebhookSyncOutcome(
                isSuccess = false,
                statusCode = null,
                responseTimeMs = elapsedMs,
                message = "Gagal terhubung ke server: ${e.localizedMessage ?: "Network Error"}",
                rawResponseJson = null
            )
        }
    }
}
