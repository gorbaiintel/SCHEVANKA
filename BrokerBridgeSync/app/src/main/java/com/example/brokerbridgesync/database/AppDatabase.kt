package com.example.brokerbridgesync.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.brokerbridgesync.database.dao.AccountDataDao
import com.example.brokerbridgesync.database.dao.SyncHistoryDao
import com.example.brokerbridgesync.database.entities.AccountDataEntity
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import com.example.brokerbridgesync.utils.Constants

@Database(
    entities = [SyncHistoryEntity::class, AccountDataEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun syncHistoryDao(): SyncHistoryDao
    abstract fun accountDataDao(): AccountDataDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    Constants.DATABASE_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
