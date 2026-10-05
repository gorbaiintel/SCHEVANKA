package com.example.brokerbridgesync.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.brokerbridgesync.viewmodel.SyncFormUiState

@Composable
fun AccountForm(
    state: SyncFormUiState,
    onFieldChange: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        ValidatedField(
            label = "Login ID (Required • 1–20 digits) *",
            value = state.loginId,
            onValueChange = { onFieldChange("loginId", it) },
            error = state.fieldErrors["loginId"],
            keyboardType = KeyboardType.Number,
            counterText = "${state.loginId.length}/20"
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ValidatedField(
                label = "Server (Optional)",
                value = state.server,
                onValueChange = { onFieldChange("server", it) },
                error = null,
                modifier = Modifier.weight(1f)
            )
            ValidatedField(
                label = "Company / Broker (Optional)",
                value = state.company,
                onValueChange = { onFieldChange("company", it) },
                error = null,
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ValidatedField(
                label = "Balance *",
                value = state.balance,
                onValueChange = { onFieldChange("balance", it) },
                error = state.fieldErrors["balance"],
                keyboardType = KeyboardType.Decimal,
                modifier = Modifier.weight(1f)
            )
            ValidatedField(
                label = "Equity *",
                value = state.equity,
                onValueChange = { onFieldChange("equity", it) },
                error = state.fieldErrors["equity"],
                keyboardType = KeyboardType.Decimal,
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ValidatedField(
                label = "Margin *",
                value = state.margin,
                onValueChange = { onFieldChange("margin", it) },
                error = state.fieldErrors["margin"],
                keyboardType = KeyboardType.Decimal,
                modifier = Modifier.weight(1f)
            )
            ValidatedField(
                label = "Free Margin *",
                value = state.freeMargin,
                onValueChange = { onFieldChange("freeMargin", it) },
                error = state.fieldErrors["freeMargin"],
                keyboardType = KeyboardType.Decimal,
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ValidatedField(
                label = "Leverage (1–500) *",
                value = state.leverage,
                onValueChange = { onFieldChange("leverage", it) },
                error = state.fieldErrors["leverage"],
                keyboardType = KeyboardType.Number,
                modifier = Modifier.weight(1f)
            )
            ValidatedField(
                label = "Currency (ISO 4217) *",
                value = state.currency,
                onValueChange = { onFieldChange("currency", it.take(3).uppercase()) },
                error = state.fieldErrors["currency"],
                counterText = "${state.currency.length}/3",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun ValidatedField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    error: String?,
    keyboardType: KeyboardType = KeyboardType.Text,
    counterText: String? = null,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label, fontSize = 12.sp) },
            isError = error != null,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            supportingText = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = error ?: "✓ Valid",
                        color = if (error != null) Color(0xFFD32F2F) else Color(0xFF1F7A1F),
                        fontSize = 11.sp
                    )
                    if (counterText != null) {
                        Text(text = counterText, fontSize = 11.sp)
                    }
                }
            },
            modifier = Modifier.fillMaxWidth()
        )
    }
}
