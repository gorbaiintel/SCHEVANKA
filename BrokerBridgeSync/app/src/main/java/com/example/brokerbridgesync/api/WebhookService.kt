package com.example.brokerbridgesync.api

import com.example.brokerbridgesync.api.models.HealthCheckResponse
import com.example.brokerbridgesync.api.models.SyncPayload
import com.example.brokerbridgesync.api.models.SyncResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Url

interface WebhookService {
    @GET("/api/broker/bridge/webhook")
    suspend fun getHealthStatus(): Response<HealthCheckResponse>

    @GET
    suspend fun getHealthStatusByUrl(@Url fullUrl: String): Response<HealthCheckResponse>

    @POST("/api/broker/bridge/webhook")
    suspend fun syncAccountData(
        @Body payload: SyncPayload
    ): Response<SyncResponse>

    @POST
    suspend fun syncAccountDataByUrl(
        @Url fullUrl: String,
        @Body payload: SyncPayload
    ): Response<SyncResponse>
}
