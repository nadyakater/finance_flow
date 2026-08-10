import { createSlice } from "@reduxjs/toolkit";

import {
  addRecurringRule,
  changeRecurringActiveStatus,
  changeRecurringAmount,
  completeForecastPayment,
  generateNextForecast,
  loadForecastsForRule,
  loadRecurringRules,
} from "../application/recurringThunks";

// =====================================================
// 11.GÜN - Düzenli gider Redux state yapısı
//
// Kullanıcının:
//
// - düzenli gider kuralları,
// - abonelikleri,
// - forecast kayıtları,
// - yüklenme durumları,
// - hata bilgileri
//
// Redux içerisinde tutulur.
// =====================================================

const initialState = {
  // =====================================================
  // 11.GÜN
  // Kullanıcının oluşturduğu bütün recurring rule
  // kayıtları burada tutulur.
  //
  // Örneğin:
  //
  // İnternet
  // Kira
  // Netflix
  // Sigorta
  // =====================================================

  rules: [],

  // =====================================================
  // 11.GÜN
  // Forecast kayıtları recurringRuleId değerine göre
  // gruplanarak tutulur.
  //
  // Örneğin:
  //
  // forecastsByRuleId = {
  //   rule1: [...],
  //   rule2: [...]
  // }
  //
  // Böylece her düzenli giderin tahmin kayıtlarına
  // kolayca ulaşabiliriz.
  // =====================================================

  forecastsByRuleId: {},

  // =====================================================
  // 11.GÜN
  // Düzenli giderlerin Firestore'dan yüklenme durumu.
  // =====================================================

  loadStatus: "idle",

  // =====================================================
  // 11.GÜN
  // Yeni düzenli gider oluşturma gibi değişikliklerin
  // durumunu tutar.
  // =====================================================

  mutationStatus: "idle",

  // =====================================================
  // 11.GÜN
  // Forecast kayıtlarının yüklenme durumu.
  // =====================================================

  forecastLoadStatus: "idle",

  // =====================================================
  // 11.GÜN
  // Düzenli gider işlemlerinde oluşan hata mesajı.
  // =====================================================

  error: null,
};

// =====================================================
// 11.GÜN
// Düzenli giderler için Redux slice oluşturuldu.
// =====================================================

const recurringSlice = createSlice({
  name: "recurring",

  initialState,

  reducers: {
    // =====================================================
    // 11.GÜN
    // Kullanıcı çıkış yaptığında veya recurring verilerinin
    // temizlenmesi gerektiğinde state başlangıç haline döner.
    // =====================================================

    resetRecurringState: () => initialState,

    // =====================================================
    // 11.GÜN
    // Kullanıcıya gösterilen hata mesajını temizler.
    // =====================================================

    clearRecurringError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // =====================================================
      // 11.GÜN
      // Düzenli giderler Firestore'dan yüklenirken.
      // =====================================================

      .addCase(loadRecurringRules.pending, (state) => {
        state.loadStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Düzenli giderler başarıyla yüklendiğinde
      // rule listesi Redux state'e yazılır.
      // =====================================================

      .addCase(loadRecurringRules.fulfilled, (state, action) => {
        state.loadStatus = "succeeded";

        state.rules = action.payload;

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Düzenli giderler yüklenemezse hata bilgisi tutulur.
      // =====================================================

      .addCase(loadRecurringRules.rejected, (state, action) => {
        state.loadStatus = "failed";

        state.error = action.payload ?? "Düzenli giderler yüklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Yeni recurring rule oluşturulurken.
      // =====================================================

      .addCase(addRecurringRule.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Yeni düzenli gider başarıyla oluşturulursa
      // rule listesine eklenir.
      // =====================================================

      .addCase(addRecurringRule.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.rules.unshift(action.payload);

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Yeni düzenli gider oluşturulamazsa hata tutulur.
      // =====================================================

      .addCase(addRecurringRule.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Düzenli gider eklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Forecast kayıtları yüklenirken.
      // =====================================================

      .addCase(loadForecastsForRule.pending, (state) => {
        state.forecastLoadStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Belirli bir recurring rule'a ait forecast kayıtları
      // ilgili rule id altında saklanır.
      // =====================================================

      .addCase(loadForecastsForRule.fulfilled, (state, action) => {
        state.forecastLoadStatus = "succeeded";

        state.forecastsByRuleId[action.payload.recurringRuleId] =
          action.payload.forecasts;

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Forecast kayıtları yüklenemezse hata tutulur.
      // =====================================================

      .addCase(loadForecastsForRule.rejected, (state, action) => {
        state.forecastLoadStatus = "failed";

        state.error = action.payload ?? "Tahmini ödeme kayıtları yüklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Yeni forecast oluşturulurken.
      // =====================================================

      .addCase(generateNextForecast.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Forecast oluşturulduğunda doğru recurring rule'un
      // forecast listesine eklenir.
      //
      // Aynı forecast zaten listede varsa ikinci kez
      // eklenmez.
      // =====================================================

      .addCase(generateNextForecast.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        const forecast = action.payload;

        const recurringRuleId = forecast.recurringRuleId;

        if (!state.forecastsByRuleId[recurringRuleId]) {
          state.forecastsByRuleId[recurringRuleId] = [];
        }

        const alreadyExists = state.forecastsByRuleId[recurringRuleId].some(
          (currentForecast) => currentForecast.id === forecast.id,
        );

        if (!alreadyExists) {
          state.forecastsByRuleId[recurringRuleId].push(forecast);
        }

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Forecast oluşturma başarısız olursa.
      // =====================================================

      .addCase(generateNextForecast.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Tahmini ödeme kaydı oluşturulamadı.";
      })

      // =====================================================
      // 11.GÜN
      // Forecast gerçek ödeme bilgisiyle kapatılırken.
      // =====================================================

      .addCase(completeForecastPayment.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Forecast ödenmiş olarak işaretlendiğinde
      // Redux içindeki eski forecast kaydı yeni haliyle
      // değiştirilir.
      //
      // Böylece status = paid olduğu anda yaklaşan ödeme
      // listesinden çıkarılabilir.
      // =====================================================

      .addCase(completeForecastPayment.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        const updatedForecast = action.payload;

        const recurringRuleId = updatedForecast.recurringRuleId;

        const forecasts = state.forecastsByRuleId[recurringRuleId] ?? [];

        state.forecastsByRuleId[recurringRuleId] = forecasts.map((forecast) =>
          forecast.id === updatedForecast.id ? updatedForecast : forecast,
        );

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Forecast ödeme işlemi başarısız olursa.
      // =====================================================

      .addCase(completeForecastPayment.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Ödeme kaydedilemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Düzenli giderin tutarı değiştirilirken.
      // =====================================================

      .addCase(changeRecurringAmount.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Tutar değişikliği başarıyla kaydedildiğinde
      // rule listesi güncellenir.
      //
      // Repository eski tutarı amountHistory içinde
      // koruduğu için geçmiş fiyat bilgileri kaybolmaz.
      // =====================================================

      .addCase(changeRecurringAmount.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.rules = state.rules.map((recurringRule) =>
          recurringRule.id === action.payload.id
            ? action.payload
            : recurringRule,
        );

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Tutar değiştirilemezse hata tutulur.
      // =====================================================

      .addCase(changeRecurringAmount.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Düzenli gider tutarı güncellenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Düzenli gider aktif/pasif yapılırken.
      // =====================================================

      .addCase(changeRecurringActiveStatus.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Aktiflik durumu değişen recurring rule
      // Redux listesindeki eski kayıtla değiştirilir.
      // =====================================================

      .addCase(changeRecurringActiveStatus.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.rules = state.rules.map((recurringRule) =>
          recurringRule.id === action.payload.id
            ? action.payload
            : recurringRule,
        );

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Aktiflik durumu değiştirilemezse hata tutulur.
      // =====================================================

      .addCase(changeRecurringActiveStatus.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Düzenli gider durumu güncellenemedi.";
      });
  },
});

// =====================================================
// 11.GÜN
// Normal reducer actionları dışarı aktarılır.
// =====================================================

export const { resetRecurringState, clearRecurringError } =
  recurringSlice.actions;

// =====================================================
// 11.GÜN
// Store içerisine eklemek için recurring reducer
// dışarı aktarılır.
// =====================================================

export default recurringSlice.reducer;
