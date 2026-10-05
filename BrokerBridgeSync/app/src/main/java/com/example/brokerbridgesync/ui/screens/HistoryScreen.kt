package com.example.brokerbridgesync.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import com.example.brokerbridgesync.ui.components.SyncHistoryList
import com.example.brokerbridgesync.utils.Constants
import com.example.brokerbridgesync.utils.DateFormatter
import com.example.brokerbridgesync.viewmodel.HistoryViewModel

@Composable
fun HistoryScreen(viewModel: HistoryViewModel) {
    val allFiltered by viewModel.filteredHistory.collectAsState()
    val query by viewModel.searchQuery.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()
    val page by viewModel.currentPage.collectAsState()

    var selectedEntry by remember { mutableStateOf<SyncHistoryEntity?>(null) }
    var showConfirmClear by remember { mutableStateOf(false) }

    val startIndex = (page - 1) * Constants.PAGE_SIZE
    val pagedItems = allFiltered.drop(startIndex).take(Constants.PAGE_SIZE)
    val totalPages = ((allFiltered.size + Constants.PAGE_SIZE - 1) / Constants.PAGE_SIZE).coerceAtLeast(1)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = viewModel::setSearchQuery,
            label = { Text("Cari Login ID atau pesan response...") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            listOf("ALL", "SUCCESS", "FAILED").forEach { filter ->
                FilterChip(
                    selected = statusFilter == filter,
                    onClick = { viewModel.setStatusFilter(filter) },
                    label = { Text(filter, fontSize = 11.sp) }
                )
            }
            OutlinedButton(
                onClick = { showConfirmClear = true },
                modifier = Modifier.padding(start = 4.dp)
            ) {
                Text("Clear All", fontSize = 11.sp, color = Color(0xFFD32F2F))
            }
        }

        if (pagedItems.isEmpty()) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Belum ada riwayat sinkronisasi.", color = Color.Gray)
            }
        } else {
            SyncHistoryList(
                items = pagedItems,
                onItemClick = { selectedEntry = it },
                onDeleteClick = viewModel::deleteItem,
                modifier = Modifier.weight(1f)
            )
        }

        // Pagination Controls (20 items per page)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedButton(
                onClick = { viewModel.prevPage() },
                enabled = page > 1
            ) {
                Text("Prev")
            }
            Text("Page $page of $totalPages (${allFiltered.size} logs)", fontSize = 12.sp)
            OutlinedButton(
                onClick = { viewModel.nextPage(allFiltered.size) },
                enabled = page < totalPages
            ) {
                Text("Next")
            }
        }
    }

    if (selectedEntry != null) {
        val entry = selectedEntry!!
        AlertDialog(
            onDismissRequest = { selectedEntry = null },
            title = { Text("Detail Sync #${entry.id} • ${entry.status}", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Login ID: ${entry.loginId}")
                    Text("Waktu: ${DateFormatter.formatTimestamp(entry.timestamp)}")
                    Text("HTTP Status: ${entry.statusCode ?: "-"} (${entry.responseTime} ms)")
                    Text("Balance: ${entry.currency} ${entry.balance} | Equity: ${entry.equity}")
                    Text("Margin: ${entry.margin} | Free Margin: ${entry.freeMargin}")
                    if (!entry.errorMessage.isNullOrBlank()) {
                        Text("Error: ${entry.errorMessage}", color = Color(0xFFD32F2F))
                    }
                    if (!entry.fullResponse.isNullOrBlank()) {
                        Text("JSON Response:\n${entry.fullResponse}", fontSize = 11.sp)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedEntry = null }) {
                    Text("Tutup")
                }
            }
        )
    }

    if (showConfirmClear) {
        AlertDialog(
            onDismissRequest = { showConfirmClear = false },
            title = { Text("Hapus Semua Riwayat?") },
            text = { Text("Seluruh catatan riwayat sinkronisasi di Room Database lokal akan dihapus permanen.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.clearAllHistory()
                        showConfirmClear = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
                ) {
                    Text("Hapus Semua")
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmClear = false }) {
                    Text("Batal")
                }
            }
        )
    }
}
