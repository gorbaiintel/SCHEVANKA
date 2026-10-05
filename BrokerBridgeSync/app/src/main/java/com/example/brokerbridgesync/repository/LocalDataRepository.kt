package com.example.brokerbridgesync.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.brokerbridgesync.database.AppDatabase
import com.example.brokerbridgesync.database.entities.AccountDataEntity
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import com.example.brokerbridgesync.utils.Constants
import kotlinx.coroutines.flow.Flow

class LocalDataRepository(context: Context) {
    private val db = AppDatabase.getInstance(context)
    private val historyDao = db.syncHistoryDao()
    private val accountDao = db.accountDataDao()
    private val prefs: SharedPreferences =
        context.getSharedPreferences(Constants.PREFS_NAME, Context.MODE_PRIVATE)

    val allHistoryFlow: Flow<List<SyncHistoryEntity>> = historyDao.observeAllHistory()
    val latestAccountFlow: Flow<AccountDataEntity?> = accountDao.observeLatestAccount()
    val allAccountsFlow: Flow<List<AccountDataEntity>> = accountDao.observeAllAccounts()

    suspend fun insertSyncHistory(entry: SyncHistoryEntity) {
        historyDao.insertHistory(entry)
    }

    suspend fun saveAccountData(account: AccountDataEntity) {
        accountDao.upsertAccount(account)
    }

    suspend fun getLatestAccount(): AccountDataEntity? {
        return accountDao.getLatestAccount()
    }

    suspend fun deleteHistoryItem(id: Int) {
        historyDao.deleteById(id)
    }

    suspend fun clearAllHistory() {
        historyDao.clearAllHistory()
    }

    suspend fun clearAllData() {
        historyDao.clearAllHistory()
        accountDao.clearAllAccounts()
    }

    var apiEndpointUrl: String
        get() = prefs.getString(Constants.KEY_API_URL, Constants.DEFAULT_WEBHOOK_URL)
            ?: Constants.DEFAULT_WEBHOOK_URL
        set(value) = prefs.edit().putString(Constants.KEY_API_URL, value.trim()).apply()

    var autoSyncEnabled: Boolean
        get() = prefs.getBoolean(Constants.KEY_AUTO_SYNC_ENABLED, false)
        set(value) = prefs.edit().putBoolean(Constants.KEY_AUTO_SYNC_ENABLED, value).apply()

    var autoSyncIntervalSec: Int
        get() = prefs.getInt(Constants.KEY_AUTO_SYNC_INTERVAL_SEC, 5)
        set(value) = prefs.edit().putInt(Constants.KEY_AUTO_SYNC_INTERVAL_SEC, value).apply()

    var notifyOnSuccess: Boolean
        get() = prefs.getBoolean(Constants.KEY_NOTIFY_SUCCESS, true)
        set(value) = prefs.edit().putBoolean(Constants.KEY_NOTIFY_SUCCESS, value).apply()

    var notifyOnFailure: Boolean
        get() = prefs.getBoolean(Constants.KEY_NOTIFY_FAILURE, true)
        set(value) = prefs.edit().putBoolean(Constants.KEY_NOTIFY_FAILURE, value).apply()

    var notifyOnHighMargin: Boolean
        get() = prefs.getBoolean(Constants.KEY_NOTIFY_HIGH_MARGIN, true)
        set(value) = prefs.edit().putBoolean(Constants.KEY_NOTIFY_HIGH_MARGIN, value).apply()

    var logLevel: String
        get() = prefs.getString(Constants.KEY_LOG_LEVEL, "INFO") ?: "INFO"
        set(value) = prefs.edit().putString(Constants.KEY_LOG_LEVEL, value).apply()
}
