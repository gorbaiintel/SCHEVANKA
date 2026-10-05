package com.example.brokerbridgesync.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_history")
data class SyncHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val timestamp: Long,
    val loginId: String,
    val status: String, // "SUCCESS", "FAILED", "TIMEOUT"
    val statusCode: Int?,
    val balance: Double,
    val equity: Double,
    val margin: Double,
    val freeMargin: Double,
    val leverage: Int,
    val currency: String,
    val responseTime: Long, // milliseconds
    val errorMessage: String?,
    val fullResponse: String? // JSON response stored
)
