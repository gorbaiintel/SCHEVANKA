package com.example.brokerbridgesync.ui.screens

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.brokerbridgesync.api.RetrofitInstance
import com.example.brokerbridgesync.repository.LocalDataRepository
import com.example.brokerbridgesync.repository.WebhookRepository
import com.example.brokerbridgesync.services.SyncService
import com.example.brokerbridgesync.utils.Constants
import com.example.brokerbridgesync.utils.ValidationUtils
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(context: Context) {
    val localRepo = remember { LocalDataRepository(context) }
    val webhookRepo = remember { WebhookRepository() }
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var endpointUrl by remember { mutableStateOf(localRepo.apiEndpointUrl) }
    var autoSyncEnabled by remember { mutableStateOf(localRepo.autoSyncEnabled) }
    var syncIntervalSec by remember { mutableStateOf(localRepo.autoSyncIntervalSec) }
    var notifySuccess by remember { mutableStateOf(localRepo.notifyOnSuccess) }
    var notifyFailure by remember { mutableStateOf(localRepo.notifyOnFailure) }
    var notifyHighMargin by remember { mutableStateOf(localRepo.notifyOnHighMargin) }
    var logLevel by remember { mutableStateOf(localRepo.logLevel) }
    var healthStatusText by remember { mutableStateOf("Tap 'Check API Health' to verify") }
    var showClearConfirm by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 1. API Configuration
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("API Endpoint Configuration", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                OutlinedTextField(
                    value = endpointUrl,
                    onValueChange = {
                        endpointUrl = it
                        if (ValidationUtils.validateEndpointUrl(it)) {
                            localRepo.apiEndpointUrl = it
                        }
                    },
                    label = { Text("Webhook Endpoint URL (HTTPS Only)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            scope.launch {
                                healthStatusText = "Checking GET $endpointUrl..."
                                val res = webhookRepo.checkHealth(endpointUrl)
                                healthStatusText = res.fold(
                                    onSuccess = { "✓ ONLINE (${it.status}) • Active Accounts: ${it.activeAccountsCount}" },
                                    onFailure = { "✕ ERROR: ${it.localizedMessage}" }
                                )
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F7A1F))
                    ) {
                        Text("Check API Health", fontSize = 12.sp)
                    }
                    OutlinedButton(
                        onClick = {
                            endpointUrl = Constants.DEFAULT_WEBHOOK_URL
                            localRepo.apiEndpointUrl = Constants.DEFAULT_WEBHOOK_URL
                        }
                    ) {
                        Text("Reset Default", fontSize = 12.sp)
                    }
                }
                Text(text = healthStatusText, fontSize = 11.sp, color = Color.DarkGray)
            }
        }

        // 2. Auto-Sync Settings (WorkManager)
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Background Auto-Sync (WorkManager)", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Switch(
                        checked = autoSyncEnabled,
                        onCheckedChange = { enabled ->
                            autoSyncEnabled = enabled
                            localRepo.autoSyncEnabled = enabled
                            if (enabled) {
                                SyncService.scheduleBackgroundSync(context, syncIntervalSec)
                            } else {
                                SyncService.cancelBackgroundSync(context)
                            }
                        }
                    )
                }
                Text("Sync Interval:", fontSize = 12.sp, color = Color.DarkGray)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(5 to "5s", 10 to "10s", 30 to "30s", 60 to "1m").forEach { (sec, label) ->
                        FilterChip(
                            selected = syncIntervalSec == sec,
                            onClick = {
                                syncIntervalSec = sec
                                localRepo.autoSyncIntervalSec = sec
                                if (autoSyncEnabled) {
                                    SyncService.scheduleBackgroundSync(context, sec)
                                }
                            },
                            label = { Text(label) }
                        )
                    }
                }
            }
        }

        // 3. Notifications & Logging
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text("Notifications & Logging", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                SettingToggleRow("Notify on Sync Success", notifySuccess) {
                    notifySuccess = it
                    localRepo.notifyOnSuccess = it
                }
                SettingToggleRow("Notify on Sync Failure", notifyFailure) {
                    notifyFailure = it
                    localRepo.notifyOnFailure = it
                }
                SettingToggleRow("Alert on High Margin Usage (>95%)", notifyHighMargin) {
                    notifyHighMargin = it
                    localRepo.notifyOnHighMargin = it
                }

                Text("Logging Level:", fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("DEBUG", "INFO", "WARN", "ERROR").forEach { lvl ->
                        FilterChip(
                            selected = logLevel == lvl,
                            onClick = {
                                logLevel = lvl
                                localRepo.logLevel = lvl
                                RetrofitInstance.setLogLevel(lvl)
                            },
                            label = { Text(lvl, fontSize = 11.sp) }
                        )
                    }
                }
            }
        }

        // 4. Data Management & About
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Data Management & About", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(
                    text = "BrokerBridgeSync v1.0.0 (Build 1) • MinSDK 24 / TargetSDK 34 • Jetpack Compose Material 3",
                    fontSize = 12.sp,
                    color = Color.DarkGray
                )
                Button(
                    onClick = { showClearConfirm = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Clear All Local Data & Presets")
                }
            }
        }
    }

    if (showClearConfirm) {
        AlertDialog(
            onDismissRequest = { showClearConfirm = false },
            title = { Text("Hapus Semua Data Lokal?") },
            text = { Text("Semua riwayat sinkronisasi dan preset akun akan dihapus dari Room Database.") },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            localRepo.clearAllData()
                            showClearConfirm = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
                ) {
                    Text("Ya, Hapus Semua")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearConfirm = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

@Composable
private fun SettingToggleRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, fontSize = 13.sp)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
