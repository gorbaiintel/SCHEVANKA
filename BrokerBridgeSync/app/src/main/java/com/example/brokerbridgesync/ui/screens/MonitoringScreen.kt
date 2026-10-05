package com.example.brokerbridgesync.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.brokerbridgesync.ui.components.StatusCard
import com.example.brokerbridgesync.utils.Constants
import com.example.brokerbridgesync.utils.DateFormatter
import com.example.brokerbridgesync.viewmodel.AccountConnectionStatus
import com.example.brokerbridgesync.viewmodel.MonitoringViewModel

@Composable
fun MonitoringScreen(viewModel: MonitoringViewModel) {
    val account by viewModel.currentAccount.collectAsState()
    val status by viewModel.connectionStatus.collectAsState()
    val scrollState = rememberScrollState()

    val balance = account?.balance ?: 1500.0
    val equity = account?.equity ?: 1524.5
    val margin = account?.margin ?: 30.0
    val freeMargin = account?.freeMargin ?: 1494.5
    val pnl = equity - balance
    val marginUsagePct = if (equity > 0) ((margin / equity) * 100.0).coerceIn(0.0, 100.0) else 0.0

    val marginIndicatorColor = when {
        marginUsagePct >= Constants.CRITICAL_MARGIN_THRESHOLD -> Color(0xFFD32F2F)
        marginUsagePct >= Constants.HIGH_MARGIN_WARNING_THRESHOLD -> Color(0xFFFFA500)
        else -> Color(0xFF1F7A1F)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Account Info Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Account #${account?.loginId ?: "10894251"}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp
                    )
                    Text(
                        text = status.name,
                        color = when (status) {
                            AccountConnectionStatus.ONLINE -> Color(0xFF1F7A1F)
                            AccountConnectionStatus.SYNCING -> Color(0xFFFFA500)
                            AccountConnectionStatus.OFFLINE -> Color(0xFFD32F2F)
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
                Text(
                    text = "Server: ${account?.server ?: "HFMarkets-LiveServer1"} • Broker: ${account?.company ?: "HF Markets"}",
                    fontSize = 12.sp,
                    color = Color.DarkGray
                )
                Text(
                    text = "Leverage: 1:${account?.leverage ?: 500} • Last Sync: ${DateFormatter.formatTimestamp(account?.lastSyncTime ?: System.currentTimeMillis())}",
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }
        }

        // 2x2 Status Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            StatusCard(
                title = "Balance",
                value = "$${String.format("%.2f", balance)}",
                subtitle = account?.currency ?: "USD",
                modifier = Modifier.weight(1f)
            )
            StatusCard(
                title = "Equity",
                value = "$${String.format("%.2f", equity)}",
                subtitle = "Floating P&L: ${if (pnl >= 0) "+" else ""}$${String.format("%.2f", pnl)}",
                accentColor = if (pnl >= 0) Color(0xFF1F7A1F) else Color(0xFFD32F2F),
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            StatusCard(
                title = "Margin Used",
                value = "$${String.format("%.2f", margin)}",
                subtitle = "${String.format("%.1f", marginUsagePct)}% utilized",
                accentColor = marginIndicatorColor,
                modifier = Modifier.weight(1f)
            )
            StatusCard(
                title = "Free Margin",
                value = "$${String.format("%.2f", freeMargin)}",
                subtitle = "Available for trades",
                modifier = Modifier.weight(1f)
            )
        }

        // Margin Utilization Chart Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Margin Utilization",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "${String.format("%.2f", marginUsagePct)}%",
                        fontWeight = FontWeight.Bold,
                        color = marginIndicatorColor
                    )
                }
                LinearProgressIndicator(
                    progress = (marginUsagePct / 100.0).toFloat(),
                    color = marginIndicatorColor,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                )
                Text(
                    text = "Green: Normal (<80%) • Yellow: High (>80%) • Red: Critical (>95%)",
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }
        }

        Button(
            onClick = { viewModel.refreshNow() },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F7A1F)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Refresh Live Account Now", fontWeight = FontWeight.Bold)
        }
    }
}
