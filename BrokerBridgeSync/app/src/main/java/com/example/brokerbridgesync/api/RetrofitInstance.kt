package com.example.brokerbridgesync.api

import com.example.brokerbridgesync.utils.Constants
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitInstance {
    @Volatile
    private var currentBaseUrl: String = Constants.DEFAULT_BASE_URL

    @Volatile
    private var loggingLevel: HttpLoggingInterceptor.Level = HttpLoggingInterceptor.Level.BODY

    private fun buildOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor { message ->
            // Redact sensitive fields from logs
            val sanitized = message.replace(Regex("\"token\"\\s*:\\s*\"[^\"]+\""), "\"token\":\"***\"")
            android.util.Log.d("BrokerBridgeHttp", sanitized)
        }.apply {
            level = loggingLevel
        }

        return OkHttpClient.Builder()
            .connectTimeout(Constants.CONNECT_TIMEOUT_SEC, TimeUnit.SECONDS)
            .readTimeout(Constants.READ_TIMEOUT_SEC, TimeUnit.SECONDS)
            .writeTimeout(Constants.WRITE_TIMEOUT_SEC, TimeUnit.SECONDS)
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("User-Agent", "BrokerBridgeSync-Android/1.0.0")
                    .build()
                chain.proceed(request)
            }
            .build()
    }

    val api: WebhookService by lazy {
        createService(currentBaseUrl)
    }

    fun createService(baseUrl: String = Constants.DEFAULT_BASE_URL): WebhookService {
        val normalizedBase = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(normalizedBase)
            .client(buildOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(WebhookService::class.java)
    }

    fun setLogLevel(levelName: String) {
        loggingLevel = when (levelName.uppercase()) {
            "DEBUG" -> HttpLoggingInterceptor.Level.BODY
            "INFO" -> HttpLoggingInterceptor.Level.HEADERS
            "WARN", "ERROR" -> HttpLoggingInterceptor.Level.BASIC
            else -> HttpLoggingInterceptor.Level.NONE
        }
    }
}
