package com.example.brokerbridgesync.utils

import com.example.brokerbridgesync.api.models.SyncPayload

data class ValidationResult(
    val isValid: Boolean,
    val fieldErrors: Map<String, String> = emptyMap()
) {
    val firstErrorMessage: String?
        get() = fieldErrors.values.firstOrNull()
}

object ValidationUtils {
    private val LOGIN_ID_REGEX = Regex("^[0-9]{1,20}$")
    private val CURRENCY_REGEX = Regex("^[A-Z]{3}$")
    private const val MAX_MONETARY_VALUE = 999_999_999.99

    val SUPPORTED_ISO_CURRENCIES = setOf(
        "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "SGD", "IDR", "HKD", "USC"
    )

    fun validateLoginId(loginId: String): Boolean {
        return LOGIN_ID_REGEX.matches(loginId.trim())
    }

    fun validateBalance(balance: Double): Boolean {
        return !balance.isNaN() && !balance.isInfinite() && balance in 0.0..MAX_MONETARY_VALUE
    }

    fun validateEquity(equity: Double): Boolean {
        return !equity.isNaN() && !equity.isInfinite() && equity in 0.0..MAX_MONETARY_VALUE
    }

    fun validateMargin(margin: Double): Boolean {
        return !margin.isNaN() && !margin.isInfinite() && margin in 0.0..MAX_MONETARY_VALUE
    }

    fun validateFreeMargin(freeMargin: Double): Boolean {
        return !freeMargin.isNaN() && !freeMargin.isInfinite() && freeMargin in 0.0..MAX_MONETARY_VALUE
    }

    fun validateLeverage(leverage: Int): Boolean {
        return leverage in 1..500
    }

    fun validateCurrency(currency: String): Boolean {
        val clean = currency.trim()
        return CURRENCY_REGEX.matches(clean)
    }

    fun validateEndpointUrl(url: String): Boolean {
        val trimmed = url.trim()
        return trimmed.startsWith("https://") && trimmed.length > 12
    }

    fun validatePayload(payload: SyncPayload): ValidationResult {
        val errors = mutableMapOf<String, String>()

        if (!validateLoginId(payload.loginId)) {
            errors["loginId"] = "Login ID wajib berupa angka 1–20 digit (^[0-9]{1,20}$)."
        }
        if (!validateBalance(payload.balance)) {
            errors["balance"] = "Balance harus berada di rentang 0 hingga 999,999,999.99."
        }
        if (!validateEquity(payload.equity)) {
            errors["equity"] = "Equity harus berada di rentang 0 hingga 999,999,999.99."
        }
        if (!validateMargin(payload.margin)) {
            errors["margin"] = "Margin harus berada di rentang 0 hingga 999,999,999.99."
        }
        if (!validateFreeMargin(payload.freeMargin)) {
            errors["freeMargin"] = "Free Margin harus berada di rentang 0 hingga 999,999,999.99."
        }
        if (!validateLeverage(payload.leverage)) {
            errors["leverage"] = "Leverage harus berada di rentang 1 hingga 500."
        }
        if (!validateCurrency(payload.currency)) {
            errors["currency"] = "Currency wajib format 3 huruf kapital ISO 4217 (cth: USD, EUR)."
        }

        return ValidationResult(
            isValid = errors.isEmpty(),
            fieldErrors = errors
        )
    }
}
