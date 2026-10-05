package com.example.brokerbridgesync.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "account_data")
data class AccountDataEntity(
    @PrimaryKey val loginId: String,
    val server: String?,
    val company: String?,
    val balance: Double,
    val equity: Double,
    val margin: Double,
    val freeMargin: Double,
    val leverage: Int,
    val currency: String,
    val lastSyncTime: Long
)
