package com.example.brokerbridgesync.api.models

import com.google.gson.annotations.SerializedName

data class SyncPayload(
    @SerializedName("loginId") val loginId: String,
    @SerializedName("server") val server: String? = null,
    @SerializedName("company") val company: String? = null,
    @SerializedName("balance") val balance: Double,
    @SerializedName("equity") val equity: Double,
    @SerializedName("margin") val margin: Double,
    @SerializedName("freeMargin") val freeMargin: Double,
    @SerializedName("leverage") val leverage: Int,
    @SerializedName("currency") val currency: String
)
