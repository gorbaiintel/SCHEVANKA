package com.example.brokerbridgesync

import com.example.brokerbridgesync.api.models.SyncPayload
import com.example.brokerbridgesync.utils.ValidationUtils
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ValidationUtilsTest {

    @Test
    fun `validateLoginId accepts 1 to 20 numeric digits and rejects invalid strings`() {
        assertTrue(ValidationUtils.validateLoginId("10894251"))
        assertTrue(ValidationUtils.validateLoginId("1"))
        assertTrue(ValidationUtils.validateLoginId("12345678901234567890"))
        assertFalse(ValidationUtils.validateLoginId(""))
        assertFalse(ValidationUtils.validateLoginId("ABC12345"))
        assertFalse(ValidationUtils.validateLoginId("123456789012345678901")) // 21 digits
    }

    @Test
    fun `validateMonetaryFields enforce 0 to 999_999_999_99 range`() {
        assertTrue(ValidationUtils.validateBalance(0.0))
        assertTrue(ValidationUtils.validateBalance(1500.50))
        assertTrue(ValidationUtils.validateBalance(999_999_999.99))
        assertFalse(ValidationUtils.validateBalance(-0.01))
        assertFalse(ValidationUtils.validateBalance(1_000_000_000.0))
    }

    @Test
    fun `validateLeverage enforces 1 to 500 range`() {
        assertTrue(ValidationUtils.validateLeverage(1))
        assertTrue(ValidationUtils.validateLeverage(100))
        assertTrue(ValidationUtils.validateLeverage(500))
        assertFalse(ValidationUtils.validateLeverage(0))
        assertFalse(ValidationUtils.validateLeverage(501))
    }

    @Test
    fun `validateCurrency enforces 3 uppercase letters ISO 4217`() {
        assertTrue(ValidationUtils.validateCurrency("USD"))
        assertTrue(ValidationUtils.validateCurrency("EUR"))
        assertFalse(ValidationUtils.validateCurrency("usd"))
        assertFalse(ValidationUtils.validateCurrency("USDT"))
        assertFalse(ValidationUtils.validateCurrency("US"))
    }

    @Test
    fun `validatePayload validates complete SyncPayload object`() {
        val valid = SyncPayload(
            loginId = "10894251",
            server = "HFMarkets-LiveServer1",
            company = "HF Markets",
            balance = 1500.0,
            equity = 1524.5,
            margin = 30.0,
            freeMargin = 1494.5,
            leverage = 500,
            currency = "USD"
        )
        assertTrue(ValidationUtils.validatePayload(valid).isValid)

        val invalid = valid.copy(loginId = "bad_id", leverage = 1000)
        val result = ValidationUtils.validatePayload(invalid)
        assertFalse(result.isValid)
        assertTrue(result.fieldErrors.containsKey("loginId"))
        assertTrue(result.fieldErrors.containsKey("leverage"))
    }
}
