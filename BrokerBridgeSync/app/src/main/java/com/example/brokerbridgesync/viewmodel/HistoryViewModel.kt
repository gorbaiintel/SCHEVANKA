package com.example.brokerbridgesync.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.brokerbridgesync.database.entities.SyncHistoryEntity
import com.example.brokerbridgesync.repository.LocalDataRepository
import com.example.brokerbridgesync.utils.Constants
import com.google.gson.GsonBuilder
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class HistoryViewModel(application: Application) : AndroidViewModel(application) {
    private val localRepo = LocalDataRepository(application)
    private val gson = GsonBuilder().setPrettyPrinting().create()

    val searchQuery = MutableStateFlow("")
    val statusFilter = MutableStateFlow("ALL") // "ALL", "SUCCESS", "FAILED"
    val currentPage = MutableStateFlow(1)

    val filteredHistory: StateFlow<List<SyncHistoryEntity>> = combine(
        localRepo.allHistoryFlow,
        searchQuery,
        statusFilter
    ) { items, query, status ->
        items.filter { entry ->
            val matchesStatus = status == "ALL" || entry.status.equals(status, ignoreCase = true)
            val matchesQuery = query.isBlank() ||
                entry.loginId.contains(query.trim(), ignoreCase = true) ||
                (entry.errorMessage?.contains(query.trim(), ignoreCase = true) == true)
            matchesStatus && matchesQuery
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setStatusFilter(filter: String) {
        statusFilter.value = filter
        currentPage.value = 1
    }

    fun setSearchQuery(query: String) {
        searchQuery.value = query
        currentPage.value = 1
    }

    fun nextPage(totalItems: Int) {
        val maxPage = ((totalItems + Constants.PAGE_SIZE - 1) / Constants.PAGE_SIZE).coerceAtLeast(1)
        if (currentPage.value < maxPage) {
            currentPage.value += 1
        }
    }

    fun prevPage() {
        if (currentPage.value > 1) {
            currentPage.value -= 1
        }
    }

    fun deleteItem(id: Int) {
        viewModelScope.launch {
            localRepo.deleteHistoryItem(id)
        }
    }

    fun clearAllHistory() {
        viewModelScope.launch {
            localRepo.clearAllHistory()
        }
    }

    fun exportToCsv(): String {
        val header = "id,timestamp,loginId,status,statusCode,balance,equity,margin,freeMargin,leverage,currency,responseTimeMs"
        val rows = filteredHistory.value.map {
            "${it.id},${it.timestamp},${it.loginId},${it.status},${it.statusCode ?: ""},${it.balance},${it.equity},${it.margin},${it.freeMargin},${it.leverage},${it.currency},${it.responseTime}"
        }
        return (listOf(header) + rows).joinToString("\n")
    }

    fun exportToJson(): String {
        return gson.toJson(filteredHistory.value)
    }
}
