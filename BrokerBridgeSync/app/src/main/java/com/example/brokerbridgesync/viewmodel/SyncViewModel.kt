package com.example.brokerbridgesync.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.brokerbridgesync.api.models.SyncPayload
import com.example.brokerbridgesync.database.entities.AccountDataEntity
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import com.example.brokerbridgesync.repository.LocalDataRepository
import com.example.brokerbridgesync.repository.WebhookRepository
import com.example.brokerbridgesync.services.NotificationService
import com.example.brokerbridgesync.utils.Constants
import com.example.brokerbridgesync.utils.ValidationUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SyncFormUiState(
    val loginId: String = "10894251",
    val server: String = "HFMarkets-LiveServer1",
    val company: String = "HF Markets",
    val balance: String = "1500.00",
    val equity: String = "1524.50",
    val margin: String = "30.00",
    val freeMargin: String = "1494.50",
    val leverage: String = "500",
    val currency: String = "USD",
    val fieldErrors: Map<String, String> = emptyMap(),
    val isSending: Boolean = false,
    val lastStatus: String? = null, // "SUCCESS" | "FAILED"
    val lastMessage: String? = null,
    val lastResponseTimeMs: Long? = null,
    val lastTimestamp: Long? = null
)

class SyncViewModel(application: Application) : AndroidViewModel(application) {
    private val localRepo = LocalDataRepository(application)
    private val webhookRepo = WebhookRepository()

    private val _uiState = MutableStateFlow(SyncFormUiState())
    val uiState: StateFlow<SyncFormUiState> = _uiState.asStateFlow()

    fun updateField(field: String, value: String) {
        val current = _uiState.value
        val next = when (field) {
            "loginId" -> current.copy(loginId = value)
            "server" -> current.copy(server = value)
            "company" -> current.copy(company = value)
            "balance" -> current.copy(balance = value)
            "equity" -> current.copy(equity = value)
            "margin" -> current.copy(margin = value)
            "freeMargin" -> current.copy(freeMargin = value)
            "leverage" -> current.copy(leverage = value)
            "currency" -> current.copy(currency = value.uppercase())
            else -> current
        }
        _uiState.value = revalidateState(next)
    }

    private fun revalidateState(state: SyncFormUiState): SyncFormUiState {
        val errors = mutableMapOf<String, String>()
        if (!ValidationUtils.validateLoginId(state.loginId)) {
            errors["loginId"] = "Wajib angka 1–20 digit (^[0-9]{1,20}$)"
        }
        val bal = state.balance.toDoubleOrNull()
        if (bal == null || !ValidationUtils.validateBalance(bal)) {
            errors["balance"] = "Rentang valid: 0 – 999,999,999.99"
        }
        val eq = state.equity.toDoubleOrNull()
        if (eq == null || !ValidationUtils.validateEquity(eq)) {
            errors["equity"] = "Rentang valid: 0 – 999,999,999.99"
        }
        val mar = state.margin.toDoubleOrNull()
        if (mar == null || !ValidationUtils.validateMargin(mar)) {
            errors["margin"] = "Rentang valid: 0 – 999,999,999.99"
        }
        val free = state.freeMargin.toDoubleOrNull()
        if (free == null || !ValidationUtils.validateFreeMargin(free)) {
            errors["freeMargin"] = "Rentang valid: 0 – 999,999,999.99"
        }
        val lev = state.leverage.toIntOrNull()
        if (lev == null || !ValidationUtils.validateLeverage(lev)) {
            errors["leverage"] = "Rentang valid: 1 – 500"
        }
        if (!ValidationUtils.validateCurrency(state.currency)) {
            errors["currency"] = "Wajib 3 huruf kapital ISO 4217 (cth: USD)"
        }
        return state.copy(fieldErrors = errors)
    }

    fun autoFillFromLastSync() {
        viewModelScope.launch {
            val latest = localRepo.getLatestAccount() ?: return@launch
            _uiState.value = revalidateState(
                _uiState.value.copy(
                    loginId = latest.loginId,
                    server = latest.server.orEmpty(),
                    company = latest.company.orEmpty(),
                    balance = String.format("%.2f", latest.balance),
                    equity = String.format("%.2f", latest.equity),
                    margin = String.format("%.2f", latest.margin),
                    freeMargin = String.format("%.2f", latest.freeMargin),
                    leverage = latest.leverage.toString(),
                    currency = latest.currency
                )
            )
        }
    }

    fun clearForm() {
        _uiState.value = SyncFormUiState(
            loginId = "",
            server = "",
            company = "",
            balance = "",
            equity = "",
            margin = "",
            freeMargin = "",
            leverage = "500",
            currency = "USD"
        )
    }

    fun saveAccountPreset() {
        val state = revalidateState(_uiState.value)
        if (state.fieldErrors.isNotEmpty()) {
            _uiState.value = state
            return
        }
        viewModelScope.launch {
            localRepo.saveAccountData(
                AccountDataEntity(
                    loginId = state.loginId.trim(),
                    server = state.server.trim().ifEmpty { null },
                    company = state.company.trim().ifEmpty { null },
                    balance = state.balance.toDoubleOrNull() ?: 0.0,
                    equity = state.equity.toDoubleOrNull() ?: 0.0,
                    margin = state.margin.toDoubleOrNull() ?: 0.0,
                    freeMargin = state.freeMargin.toDoubleOrNull() ?: 0.0,
                    leverage = state.leverage.toIntOrNull() ?: 500,
                    currency = state.currency.trim(),
                    lastSyncTime = System.currentTimeMillis()
                )
            )
            _uiState.value = state.copy(
                lastStatus = "SUCCESS",
                lastMessage = "Preset akun #${state.loginId} berhasil disimpan ke Room Database."
            )
        }
    }

    fun sendSyncPayload() {
        val validated = revalidateState(_uiState.value)
        if (validated.fieldErrors.isNotEmpty()) {
            _uiState.value = validated.copy(
                lastStatus = "FAILED",
                lastMessage = validated.fieldErrors.values.first()
            )
            return
        }

        val payload = SyncPayload(
            loginId = validated.loginId.trim(),
            server = validated.server.trim().ifEmpty { null },
            company = validated.company.trim().ifEmpty { null },
            balance = validated.balance.toDouble(),
            equity = validated.equity.toDouble(),
            margin = validated.margin.toDouble(),
            freeMargin = validated.freeMargin.toDouble(),
            leverage = validated.leverage.toInt(),
            currency = validated.currency.trim()
        )

        _uiState.value = validated.copy(isSending = true, lastMessage = null)

        viewModelScope.launch {
            val outcome = webhookRepo.syncAccount(payload, localRepo.apiEndpointUrl)
            val now = System.currentTimeMillis()

            localRepo.insertSyncHistory(
                SyncHistoryEntity(
                    timestamp = now,
                    loginId = payload.loginId,
                    status = when {
                        outcome.isSuccess -> "SUCCESS"
                        outcome.isTimeout -> "TIMEOUT"
                        else -> "FAILED"
                    },
                    statusCode = outcome.statusCode,
                    balance = payload.balance,
                    equity = payload.equity,
                    margin = payload.margin,
                    freeMargin = payload.freeMargin,
                    leverage = payload.leverage,
                    currency = payload.currency,
                    responseTime = outcome.responseTimeMs,
                    errorMessage = if (outcome.isSuccess) null else outcome.message,
                    fullResponse = outcome.rawResponseJson
                )
            )

            if (outcome.isSuccess) {
                localRepo.saveAccountData(
                    AccountDataEntity(
                        loginId = payload.loginId,
                        server = payload.server,
                        company = payload.company,
                        balance = payload.balance,
                        equity = payload.equity,
                        margin = payload.margin,
                        freeMargin = payload.freeMargin,
                        leverage = payload.leverage,
                        currency = payload.currency,
                        lastSyncTime = now
                    )
                )
                if (localRepo.notifyOnSuccess) {
                    NotificationService.showSyncSuccessNotification(
                        getApplication(),
                        payload.loginId,
                        payload.balance,
                        outcome.responseTimeMs
                    )
                }
                val marginUsage = if (payload.equity > 0) (payload.margin / payload.equity) * 100.0 else 0.0
                if (localRepo.notifyOnHighMargin && marginUsage >= Constants.CRITICAL_MARGIN_THRESHOLD) {
                    NotificationService.showCriticalMarginAlert(
                        getApplication(),
                        payload.loginId,
                        marginUsage
                    )
                }
            } else if (localRepo.notifyOnFailure) {
                NotificationService.showSyncFailureNotification(
                    getApplication(),
                    payload.loginId,
                    outcome.message
                )
            }

            _uiState.value = _uiState.value.copy(
                isSending = false,
                lastStatus = if (outcome.isSuccess) "SUCCESS" else "FAILED",
                lastMessage = outcome.message,
                lastResponseTimeMs = outcome.responseTimeMs,
                lastTimestamp = now
            )
        }
    }
}
