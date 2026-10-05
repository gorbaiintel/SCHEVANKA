package com.example.brokerbridgesync.api.models

import com.google.gson.annotations.SerializedName

data class HealthCheckResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("status") val status: String,
    @SerializedName("endpoint") val endpoint: String,
    @SerializedName("allowedMethods") val allowedMethods: List<String>,
    @SerializedName("activeAccountsCount") val activeAccountsCount: Int,
    @SerializedName("expectedPostPayload") val expectedPostPayload: Map<String, Any>,
    @SerializedName("timestamp") val timestamp: String
)
