package com.example.brokerbridgesync.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.brokerbridgesync.database.entities.AccountDataEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AccountDataDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAccount(account: AccountDataEntity)

    @Query("SELECT * FROM account_data ORDER BY lastSyncTime DESC LIMIT 1")
    fun observeLatestAccount(): Flow<AccountDataEntity?>

    @Query("SELECT * FROM account_data ORDER BY lastSyncTime DESC LIMIT 1")
    suspend fun getLatestAccount(): AccountDataEntity?

    @Query("SELECT * FROM account_data ORDER BY lastSyncTime DESC")
    fun observeAllAccounts(): Flow<List<AccountDataEntity>>

    @Query("DELETE FROM account_data")
    suspend fun clearAllAccounts()
}
