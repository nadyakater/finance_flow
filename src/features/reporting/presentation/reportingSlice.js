import { createSlice } from "@reduxjs/toolkit";

import {
  loadReportingSettings,
  updateReportingSettings,
} from "../application/reportingThunks";

// =====================================================
// 11.GÜN - Raporlama dönemi Redux state yapısı
//
// Kullanıcının seçtiği finansal dönem ayarları
// Redux içerisinde tutulur.
//
// Varsayılan olarak:
//
// - Takvim ayı seçili gelir.
// - Özel ay başlangıç günü 1'dir.
// - Kredi kartı seçimi boştur.
// =====================================================

const initialState = {
  settings: {
    mode: "calendarMonth",

    customMonthStartDay: 1,

    selectedCreditCardId: "",
  },

  loadStatus: "idle",

  saveStatus: "idle",

  error: null,
};

// =====================================================
// 11.GÜN
// Raporlama ayarlarının Redux slice yapısı oluşturuldu.
// =====================================================

const reportingSlice = createSlice({
  name: "reporting",

  initialState,

  reducers: {
    // =====================================================
    // 11.GÜN
    // Kullanıcı çıkış yaptığında veya raporlama verisinin
    // temizlenmesi gerektiğinde state başlangıç haline döner.
    // =====================================================

    resetReportingState: () => initialState,

    // =====================================================
    // 11.GÜN
    // Kaydetme sonrası gösterilen hata veya durum
    // bilgisini temizlemek için kullanılır.
    // =====================================================

    clearReportingError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // =====================================================
      // 11.GÜN
      // Firestore'dan raporlama ayarları yüklenirken
      // loading durumu tutulur.
      // =====================================================

      .addCase(loadReportingSettings.pending, (state) => {
        state.loadStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Raporlama ayarları başarıyla yüklendiğinde
      // Firestore'dan gelen değerler Redux'a yazılır.
      // =====================================================

      .addCase(loadReportingSettings.fulfilled, (state, action) => {
        state.loadStatus = "succeeded";

        state.settings = {
          mode: action.payload.mode ?? "calendarMonth",

          customMonthStartDay: Number(action.payload.customMonthStartDay ?? 1),

          selectedCreditCardId: action.payload.selectedCreditCardId ?? "",
        };

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Ayarlar yüklenemezse hata mesajı Redux state'e
      // kaydedilir.
      // =====================================================

      .addCase(loadReportingSettings.rejected, (state, action) => {
        state.loadStatus = "failed";

        state.error = action.payload ?? "Raporlama ayarları yüklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Kullanıcı yeni bir raporlama ayarı kaydederken
      // saveStatus loading olur.
      //
      // Bu bilgiyi daha sonra butonda
      // "Kaydediliyor..." göstermek için kullanacağız.
      // =====================================================

      .addCase(updateReportingSettings.pending, (state) => {
        state.saveStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Ayar başarıyla Firestore'a kaydedildikten sonra
      // güncel değerler Redux state'e de yazılır.
      //
      // Böylece ekran Firestore'u tekrar okumadan
      // yeni raporlama seçimini hemen kullanabilir.
      // =====================================================

      .addCase(updateReportingSettings.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";

        state.settings = {
          mode: action.payload.mode ?? "calendarMonth",

          customMonthStartDay: Number(action.payload.customMonthStartDay ?? 1),

          selectedCreditCardId: action.payload.selectedCreditCardId ?? "",
        };

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Ayar Firestore'a kaydedilemezse hata bilgisi
      // kullanıcıya göstermek üzere state'te saklanır.
      // =====================================================

      .addCase(updateReportingSettings.rejected, (state, action) => {
        state.saveStatus = "failed";

        state.error = action.payload ?? "Raporlama ayarları kaydedilemedi.";
      });
  },
});

// =====================================================
// 11.GÜN
// Slice içerisindeki normal reducer actionları dışarı
// aktarılır.
// =====================================================

export const { resetReportingState, clearReportingError } =
  reportingSlice.actions;

// =====================================================
// 11.GÜN
// Store içerisine eklemek için reporting reducer
// dışarı aktarılır.
// =====================================================

export default reportingSlice.reducer;
