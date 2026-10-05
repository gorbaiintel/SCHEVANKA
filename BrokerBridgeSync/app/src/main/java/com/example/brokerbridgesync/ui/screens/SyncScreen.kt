package com.example.brokerbridgesync.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import com.example.brokerbridgesync.ui.components.AccountForm
import com.example.brokerbridgesync.utils.DateFormatter
import com.example.brokerbridgesync.viewmodel.SyncViewModel

@Composable
fun SyncScreen(viewModel: SyncViewModel) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1F7A1F))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Broker Bridge Webhook Sync",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "POST /api/broker/bridge/webhook • Real-Time MT4 Sync",
                    color = Color(0xFFE8F5E9),
                    fontSize = 12.sp
                )
            }
        }

        // Quick Preset Actions
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = { viewModel.autoFillFromLastSync() },
                modifier = Modifier.weight(1f)
            ) {
                Text("Auto-Fill Last Sync", fontSize = 12.sp)
            }
            OutlinedButton(
                onClick = { viewModel.saveAccountPreset() },
                modifier = Modifier.weight(1f)
            ) {
                Text("Save Account Preset", fontSize = 12.sp)
            }
        }

        // Form Fields
        AccountForm(
            state = state,
            onFieldChange = viewModel::updateField
        )

        // Sticky Action Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = { viewModel.sendSyncPayload() },
                enabled = !state.isSending,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F7A1F)),
                modifier = Modifier.weight(1f)
            ) {
                if (state.isSending) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.height(18.dp)
                    )
                } else {
                    Text("Send Webhook Sync", fontWeight = FontWeight.Bold)
                }
            }

            OutlinedButton(
                onClick = { viewModel.clearForm() },
                enabled = !state.isSending
            ) {
                Text("Clear")
            }
        }

        // Response Status Section
        if (state.lastStatus != null || state.lastMessage != null) {
            val isSuccess = state.lastStatus == "SUCCESS"
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (isSuccess) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)
                )
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isSuccess) "✓ SYNC SUCCESS" else "✕ SYNC FAILED",
                            color = if (isSuccess) Color(0xFF1F7A1F) else Color(0xFFD32F2F),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        if (state.lastResponseTimeMs != null) {
                            Text(
                                text = "${state.lastResponseTimeMs} ms",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                    Text(
                        text = state.lastMessage ?: "",
                        fontSize = 12.sp,
                        color = Color.Black
                    )
                    if (state.lastTimestamp != null) {
                        Text(
                            text = "Timestamp: ${DateFormatter.formatTimestamp(state.lastTimestamp!!)}",
                            fontSize = 11.sp,
                            color = Color.DarkGray
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}
