import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  getReportingSettings,
  saveReportingSettings,
} from "../infrastructure/firebaseReportingRepository";

// =====================================================
// 11.GÜN
// Raporlama ayarlarıyla ilgili Firebase hatalarını
// kullanıcıya daha anlaşılır Türkçe mesajlara çevirir.
// =====================================================

function getReportingErrorMessage(error) {
  const errorCode = error?.message ?? "";

  if (errorCode === "REPORTING_USER_REQUIRED") {
    return "Raporlama ayarları için kullanıcı oturumu bulunamadı.";
  }

  if (errorCode === "REPORTING_MODE_INVALID") {
    return "Geçersiz raporlama dönemi seçildi.";
  }

  if (errorCode === "REPORTING_CUSTOM_START_DAY_INVALID") {
    return "Finansal ay başlangıç günü 1 ile 31 arasında olmalıdır.";
  }

  if (errorCode === "REPORTING_CREDIT_CARD_REQUIRED") {
    return "Kredi kartı dönemi için bir kredi kartı seçmelisiniz.";
  }

  return "Raporlama ayarları işlemi sırasında bir hata oluştu.";
}

// =====================================================
// 11.GÜN
// Kullanıcının daha önce kaydettiği raporlama
// ayarlarını Firestore'dan yükler.
//
// Kullanıcı daha önce ayar kaydetmemişse repository
// varsayılan olarak Takvim Ayı seçeneğini döndürür.
// =====================================================

export const loadReportingSettings = createAsyncThunk(
  "reporting/loadReportingSettings",

  async (userId, { rejectWithValue }) => {
    try {
      const reportingSettings = await getReportingSettings(userId);

      return reportingSettings;
    } catch (error) {
      return rejectWithValue(getReportingErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Kullanıcının yaptığı raporlama dönemi seçimini
// Firestore'a kaydeder.
//
// Örneğin:
//
// Takvim Ayı
//
// veya
//
// Özel Finansal Ay
// Başlangıç günü: 25
//
// veya
//
// Kredi Kartı Dönemi
// Seçilen kart: kartId
//
// gibi ayarlar buradan kaydedilir.
// =====================================================

export const updateReportingSettings = createAsyncThunk(
  "reporting/updateReportingSettings",

  async (
    { userId, mode, customMonthStartDay, selectedCreditCardId },
    { rejectWithValue },
  ) => {
    try {
      const updatedSettings = await saveReportingSettings(userId, {
        mode,
        customMonthStartDay,
        selectedCreditCardId,
      });

      return updatedSettings;
    } catch (error) {
      return rejectWithValue(getReportingErrorMessage(error));
    }
  },
);
