package com.example.brokerbridgesync.services

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.brokerbridgesync.api.models.SyncPayload
import com.example.brokerbridgesync.database.entities.AccountDataEntity
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import com.example.brokerbridgesync.repository.LocalDataRepository
import com.example.brokerbridgesync.repository.WebhookRepository
import com.example.brokerbridgesync.utils.Constants
import java.util.concurrent.TimeUnit

class SyncService(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val localRepo = LocalDataRepository(appContext)
    private val webhookRepo = WebhookRepository()

    override suspend fun doWork(): Result {
        if (!localRepo.autoSyncEnabled) {
            return Result.success()
        }

        val latestAccount = localRepo.getLatestAccount() ?: return Result.success()
        val payload = SyncPayload(
            loginId = latestAccount.loginId,
            server = latestAccount.server,
            company = latestAccount.company,
            balance = latestAccount.balance,
            equity = latestAccount.equity,
            margin = latestAccount.margin,
            freeMargin = latestAccount.freeMargin,
            leverage = latestAccount.leverage,
            currency = latestAccount.currency
        )

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
                    applicationContext,
                    payload.loginId,
                    payload.balance,
                    outcome.responseTimeMs
                )
            }
            val marginUsage = if (payload.equity > 0) (payload.margin / payload.equity) * 100.0 else 0.0
            if (localRepo.notifyOnHighMargin && marginUsage >= Constants.CRITICAL_MARGIN_THRESHOLD) {
                NotificationService.showCriticalMarginAlert(
                    applicationContext,
                    payload.loginId,
                    marginUsage
                )
            }
            return Result.success()
        } else {
            if (localRepo.notifyOnFailure) {
                NotificationService.showSyncFailureNotification(
                    applicationContext,
                    payload.loginId,
                    outcome.message
                )
            }
            return Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME_PERIODIC = "broker_bridge_periodic_sync"
        private const val WORK_NAME_IMMEDIATE = "broker_bridge_immediate_sync"

        fun scheduleBackgroundSync(context: Context, intervalSeconds: Int) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val immediateRequest = OneTimeWorkRequestBuilder<SyncService>()
                .setConstraints(constraints)
                .setInitialDelay(intervalSeconds.toLong(), TimeUnit.SECONDS)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME_IMMEDIATE,
                ExistingWorkPolicy.REPLACE,
                immediateRequest
            )

            val periodicMinutes = (intervalSeconds / 60).coerceAtLeast(15).toLong()
            val periodicRequest = PeriodicWorkRequestBuilder<SyncService>(
                periodicMinutes,
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME_PERIODIC,
                ExistingPeriodicWorkPolicy.UPDATE,
                periodicRequest
            )
        }

        fun cancelBackgroundSync(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME_IMMEDIATE)
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME_PERIODIC)
        }
    }
}
