package com.example.brokerbridgesync.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncHistoryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(entry: SyncHistoryEntity): Long

    @Query("SELECT * FROM sync_history ORDER BY timestamp DESC")
    fun observeAllHistory(): Flow<List<SyncHistoryEntity>>

    @Query("SELECT * FROM sync_history ORDER BY timestamp DESC LIMIT :limit OFFSET :offset")
    suspend fun getHistoryPage(limit: Int, offset: Int): List<SyncHistoryEntity>

    @Query("DELETE FROM sync_history WHERE id = :id")
    suspend fun deleteById(id: Int)

    @Query("DELETE FROM sync_history")
    suspend fun clearAllHistory()
}
