import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createNextForecast,
  createRecurringRule,
  getForecastsForRule,
  getRecurringRules,
  markForecastAsPaid,
  updateRecurringAmount,
  updateRecurringRuleActiveStatus,
} from "../infrastructure/firebaseRecurringRepository";

// =====================================================
// 11.GÜN - Düzenli gider hata mesajları
//
// Repository katmanından gelen teknik hata kodları
// kullanıcıya daha anlaşılır Türkçe mesajlara çevrilir.
// =====================================================

function getRecurringErrorMessage(error) {
  const errorCode = error?.message ?? "";

  if (errorCode === "RECURRING_USER_REQUIRED") {
    return "Düzenli gider işlemi için kullanıcı oturumu bulunamadı.";
  }

  if (errorCode === "RECURRING_NAME_REQUIRED") {
    return "Düzenli gider adı zorunludur.";
  }

  if (errorCode === "RECURRING_DAY_INVALID") {
    return "Ödeme günü 1 ile 31 arasında olmalıdır.";
  }

  if (errorCode === "RECURRING_AMOUNT_INVALID") {
    return "Tahmini tutar sıfırdan büyük olmalıdır.";
  }

  if (errorCode === "RECURRING_RULE_REQUIRED") {
    return "Düzenli gider kaydı bulunamadı.";
  }

  if (errorCode === "RECURRING_RULE_NOT_FOUND") {
    return "Düzenli gider kaydı bulunamadı.";
  }

  if (errorCode === "RECURRING_FORECAST_REQUIRED") {
    return "Ödeme tahmini kaydı bulunamadı.";
  }

  if (errorCode === "RECURRING_FORECAST_NOT_FOUND") {
    return "Ödeme tahmini kaydı bulunamadı.";
  }

  if (errorCode === "RECURRING_FORECAST_ALREADY_PAID") {
    return "Bu ödeme daha önce kaydedilmiş.";
  }

  return "Düzenli gider işlemi sırasında bir hata oluştu.";
}

// =====================================================
// 11.GÜN
// Kullanıcının bütün düzenli gider ve abonelik
// kurallarını Firestore'dan yükler.
// =====================================================

export const loadRecurringRules = createAsyncThunk(
  "recurring/loadRecurringRules",

  async (userId, { rejectWithValue }) => {
    try {
      return await getRecurringRules(userId);
    } catch (error) {
      return rejectWithValue(getRecurringErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Yeni bir düzenli gider veya abonelik kuralı oluşturur.
//
// Örneğin:
//
// İnternet
// Her ayın 15'i
// Tahmini 600 TL
// =====================================================

export const addRecurringRule = createAsyncThunk(
  "recurring/addRecurringRule",

  async (
    {
      userId,
      name,
      categoryId,
      categoryPath,
      recurringDay,
      estimatedAmountMinor,
    },
    { rejectWithValue },
  ) => {
    try {
      return await createRecurringRule(userId, {
        name,
        categoryId,
        categoryPath,
        recurringDay,
        estimatedAmountMinor,
      });
    } catch (error) {
      return rejectWithValue(getRecurringErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Bir düzenli gider için sıradaki forecast kaydını
// oluşturur.
//
// Bu işlem gerçek transaction oluşturmaz.
//
// Sadece gelecekte yapılması beklenen ödeme kaydı
// hazırlanır.
// =====================================================

export const generateNextForecast = createAsyncThunk(
  "recurring/generateNextForecast",

  async ({ userId, recurringRule }, { rejectWithValue }) => {
    try {
      return await createNextForecast(userId, recurringRule);
    } catch (error) {
      return rejectWithValue(getRecurringErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Belirli bir düzenli giderin forecast kayıtlarını
// Firestore'dan getirir.
// =====================================================

export const loadForecastsForRule = createAsyncThunk(
  "recurring/loadForecastsForRule",

  async ({ userId, recurringRuleId }, { rejectWithValue }) => {
    try {
      const forecasts = await getForecastsForRule(userId, recurringRuleId);

      return {
        recurringRuleId,
        forecasts,
      };
    } catch (error) {
      return rejectWithValue(getRecurringErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Forecast kaydı gerçek ödeme bilgisiyle kapatılır.
//
// estimatedAmountMinor korunur.
// actualAmountMinor ayrıca kaydedilir.
//
// Böylece tahmin ile gerçek tutar karşılaştırılabilir.
// =====================================================

export const completeForecastPayment = createAsyncThunk(
  "recurring/completeForecastPayment",

  async (
    {
      userId,
      recurringRuleId,
      forecastId,
      actualAmountMinor,
      transactionId,
      paidAt,
    },
    { rejectWithValue },
  ) => {
    try {
      return await markForecastAsPaid(userId, {
        recurringRuleId,
        forecastId,
        actualAmountMinor,
        transactionId,
        paidAt,
      });
    } catch (error) {
      return rejectWithValue(getRecurringErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Düzenli giderin tahmini tutarı değiştiğinde yeni tutar
// kaydedilir.
//
// Eski tutar silinmez.
// amountHistory içerisinde korunur.
// =====================================================

export const changeRecurringAmount = createAsyncThunk(
  "recurring/changeRecurringAmount",

  async (
    { userId, recurringRuleId, newAmountMinor, effectiveFrom },
    { rejectWithValue },
  ) => {
    try {
      return await updateRecurringAmount(userId, {
        recurringRuleId,
        newAmountMinor,
        effectiveFrom,
      });
    } catch (error) {
      return rejectWithValue(getRecurringErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Düzenli gider veya aboneliğin aktif/pasif durumunu
// değiştirir.
//
// Silmek yerine pasif hale getirildiği için eski
// forecast ve tutar geçmişi korunur.
// =====================================================

export const changeRecurringActiveStatus = createAsyncThunk(
  "recurring/changeRecurringActiveStatus",

  async ({ userId, recurringRuleId, isActive }, { rejectWithValue }) => {
    try {
      return await updateRecurringRuleActiveStatus(
        userId,
        recurringRuleId,
        isActive,
      );
    } catch (error) {
      return rejectWithValue(getRecurringErrorMessage(error));
    }
  },
);
