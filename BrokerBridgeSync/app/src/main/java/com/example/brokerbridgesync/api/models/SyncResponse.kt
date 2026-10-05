package com.example.brokerbridgesync.api.models

import com.google.gson.annotations.SerializedName

data class SyncResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String? = null,
    @SerializedName("timestamp") val timestamp: String? = null,
    @SerializedName("account") val account: SyncedAccountSnapshot? = null
)

data class SyncedAccountSnapshot(
    @SerializedName("loginId") val loginId: String?,
    @SerializedName("server") val server: String?,
    @SerializedName("company") val company: String?,
    @SerializedName("balance") val balance: Double?,
    @SerializedName("equity") val equity: Double?,
    @SerializedName("margin") val margin: Double?,
    @SerializedName("freeMargin") val freeMargin: Double?,
    @SerializedName("leverage") val leverage: Int?,
    @SerializedName("currency") val currency: String?,
    @SerializedName("serverPingMs") val serverPingMs: Int?,
    @SerializedName("timestamp") val timestamp: String?
)
