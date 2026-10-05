package com.example.brokerbridgesync.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.brokerbridgesync.api.models.SyncPayload
import com.example.brokerbridgesync.database.entities.AccountDataEntity
import com.example.brokerbridgesync.repository.LocalDataRepository
import com.example.brokerbridgesync.repository.WebhookRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

enum class AccountConnectionStatus {
    ONLINE, OFFLINE, SYNCING
}

class MonitoringViewModel(application: Application) : AndroidViewModel(application) {
    private val localRepo = LocalDataRepository(application)
    private val webhookRepo = WebhookRepository()

    val currentAccount: StateFlow<AccountDataEntity?> =
        localRepo.latestAccountFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _connectionStatus = MutableStateFlow(AccountConnectionStatus.ONLINE)
    val connectionStatus: StateFlow<AccountConnectionStatus> = _connectionStatus.asStateFlow()

    private var liveRefreshJob: Job? = null

    init {
        startLiveMonitorLoop()
    }

    fun startLiveMonitorLoop() {
        liveRefreshJob?.cancel()
        liveRefreshJob = viewModelScope.launch {
            while (isActive) {
                val intervalMs = (localRepo.autoSyncIntervalSec.coerceAtLeast(5)) * 1000L
                delay(intervalMs)
                if (localRepo.autoSyncEnabled) {
                    refreshNow()
                }
            }
        }
    }

    fun refreshNow() {
        val acc = currentAccount.value ?: return
        viewModelScope.launch {
            _connectionStatus.value = AccountConnectionStatus.SYNCING
            val outcome = webhookRepo.syncAccount(
                SyncPayload(
                    loginId = acc.loginId,
                    server = acc.server,
                    company = acc.company,
                    balance = acc.balance,
                    equity = acc.equity,
                    margin = acc.margin,
                    freeMargin = acc.freeMargin,
                    leverage = acc.leverage,
                    currency = acc.currency
                ),
                localRepo.apiEndpointUrl
            )
            _connectionStatus.value =
                if (outcome.isSuccess) AccountConnectionStatus.ONLINE else AccountConnectionStatus.OFFLINE
        }
    }
}
