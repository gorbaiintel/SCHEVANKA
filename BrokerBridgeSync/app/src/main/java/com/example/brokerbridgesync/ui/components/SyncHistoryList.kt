package com.example.brokerbridgesync.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import com.example.brokerbridgesync.utils.DateFormatter

@Composable
fun SyncHistoryList(
    items: List<SyncHistoryEntity>,
    onItemClick: (SyncHistoryEntity) -> Unit,
    onDeleteClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(items, key = { it.id }) { item ->
            val statusColor = when (item.status) {
                "SUCCESS" -> Color(0xFF1F7A1F)
                "TIMEOUT" -> Color(0xFFFFA500)
                else -> Color(0xFFD32F2F)
            }
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onItemClick(item) },
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = item.status,
                                color = statusColor,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "Login #${item.loginId}",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp
                            )
                            Text(
                                text = "${item.responseTime}ms",
                                color = Color.Gray,
                                fontSize = 11.sp
                            )
                        }
                        Text(
                            text = "Balance: ${item.currency} ${String.format("%.2f", item.balance)} • Equity: ${String.format("%.2f", item.equity)}",
                            fontSize = 12.sp,
                            color = Color.DarkGray
                        )
                        Text(
                            text = DateFormatter.formatTimestamp(item.timestamp),
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                    IconButton(onClick = { onDeleteClick(item.id) }) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete",
                            tint = Color(0xFFD32F2F)
                        )
                    }
                }
            }
        }
    }
}
