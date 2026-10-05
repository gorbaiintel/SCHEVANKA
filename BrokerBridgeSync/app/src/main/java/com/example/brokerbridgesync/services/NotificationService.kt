package com.example.brokerbridgesync.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.example.brokerbridgesync.MainActivity

class NotificationService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val CHANNEL_ID_SYNC = "broker_bridge_sync_channel"
        const val CHANNEL_ID_ALERTS = "broker_bridge_alerts_channel"

        private fun ensureChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val manager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                val syncChannel = NotificationChannel(
                    CHANNEL_ID_SYNC,
                    "Broker Webhook Sync Status",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Notifications for real-time MT4/broker webhook sync completion"
                }

                val alertChannel = NotificationChannel(
                    CHANNEL_ID_ALERTS,
                    "High Margin & Critical Account Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "High-priority alerts when margin usage exceeds 95%"
                }

                manager.createNotificationChannel(syncChannel)
                manager.createNotificationChannel(alertChannel)
            }
        }

        fun showSyncSuccessNotification(
            context: Context,
            loginId: String,
            balance: Double,
            responseTimeMs: Long
        ) {
            ensureChannels(context)
            val manager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val openIntent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                100,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(context, CHANNEL_ID_SYNC)
                .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
                .setContentTitle("Sync Berhasil • Akun #$loginId")
                .setContentText("Balance: $${String.format("%.2f", balance)} (${responseTimeMs}ms)")
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()

            manager.notify(1001, notification)
        }

        fun showSyncFailureNotification(
            context: Context,
            loginId: String,
            errorMessage: String
        ) {
            ensureChannels(context)
            val manager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val notification = NotificationCompat.Builder(context, CHANNEL_ID_SYNC)
                .setSmallIcon(android.R.drawable.stat_notify_error)
                .setContentTitle("Sync Gagal • Akun #$loginId")
                .setContentText(errorMessage)
                .setAutoCancel(true)
                .build()

            manager.notify(1002, notification)
        }

        fun showCriticalMarginAlert(
            context: Context,
            loginId: String,
            marginUsagePercent: Double
        ) {
            ensureChannels(context)
            val manager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val notification = NotificationCompat.Builder(context, CHANNEL_ID_ALERTS)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("⚠️ Peringatan Margin Kritis (${String.format("%.1f", marginUsagePercent)}%)")
                .setContentText("Penggunaan margin pada Akun #$loginId melampaui batas kritis 95%!")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()

            manager.notify(1003, notification)
        }
    }
}
