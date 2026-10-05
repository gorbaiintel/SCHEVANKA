package com.example.brokerbridgesync

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.brokerbridgesync.ui.screens.HistoryScreen
import com.example.brokerbridgesync.ui.screens.MonitoringScreen
import com.example.brokerbridgesync.ui.screens.SettingsScreen
import com.example.brokerbridgesync.ui.screens.SyncScreen
import com.example.brokerbridgesync.viewmodel.HistoryViewModel
import com.example.brokerbridgesync.viewmodel.MonitoringViewModel
import com.example.brokerbridgesync.viewmodel.SyncViewModel

private val BrokerColorScheme = lightColorScheme(
    primary = Color(0xFF1F7A1F),
    secondary = Color(0xFFFFA500),
    error = Color(0xFFD32F2F),
    background = Color(0xFFF5F5F5),
    surface = Color.White
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = BrokerColorScheme) {
                BrokerBridgeMainApp()
            }
        }
    }
}

@Composable
fun BrokerBridgeMainApp() {
    val navController = rememberNavController()
    val syncViewModel: SyncViewModel = viewModel()
    val monitoringViewModel: MonitoringViewModel = viewModel()
    val historyViewModel: HistoryViewModel = viewModel()
    val context = LocalContext.current

    val navItems = listOf(
        Triple("sync", "Sync", Icons.Default.Sync),
        Triple("monitor", "Monitor", Icons.Default.Analytics),
        Triple("history", "History", Icons.Default.History),
        Triple("settings", "Settings", Icons.Default.Settings)
    )

    Scaffold(
        containerColor = Color(0xFFF5F5F5),
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                navItems.forEach { (route, label, icon) ->
                    NavigationBarItem(
                        selected = currentRoute == route,
                        onClick = {
                            navController.navigate(route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "sync",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("sync") { SyncScreen(syncViewModel) }
            composable("monitor") { MonitoringScreen(monitoringViewModel) }
            composable("history") { HistoryScreen(historyViewModel) }
            composable("settings") { SettingsScreen(context) }
        }
    }
}
