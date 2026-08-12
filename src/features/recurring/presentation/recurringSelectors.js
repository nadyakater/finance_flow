import { createSelector } from "@reduxjs/toolkit";

import {
  calculateForecastErrorMinor,
  calculateForecastErrorPercent,
  calculateOverdue,
  getTodayDateValue,
  shouldShowInUpcomingPayments,
} from "../domain/recurringCalculations";

// =====================================================
// 11.GÜN
// Recurring state'e ulaşmak için temel selector.
// =====================================================

const selectRecurringState = (state) => state.recurring;

// =====================================================
// 11.GÜN
// Kullanıcının bütün düzenli gider ve abonelik
// kurallarını Redux'tan alır.
// =====================================================

export const selectRecurringRules = (state) =>
  selectRecurringState(state).rules;

// =====================================================
// 11.GÜN
// Sadece aktif olan düzenli giderleri getirir.
//
// Pasif hale getirilen abonelikler geçmiş bilgileri
// kaybolmasın diye sistemde tutulur ancak yeni forecast
// üretiminde kullanılmaz.
// =====================================================

export const selectActiveRecurringRules = createSelector(
  [selectRecurringRules],
  (rules) => rules.filter((rule) => rule.isActive),
);

// =====================================================
// 11.GÜN
// Forecast kayıtlarını recurring rule kimliğine göre
// gruplanmış şekilde Redux'tan alır.
// =====================================================

export const selectForecastsByRuleId = (state) =>
  selectRecurringState(state).forecastsByRuleId;

// =====================================================
// 11.GÜN
// Düzenli giderlerin yüklenme durumunu alır.
// =====================================================

export const selectRecurringLoadStatus = (state) =>
  selectRecurringState(state).loadStatus;

// =====================================================
// 11.GÜN
// Düzenli gider ekleme, ödeme, fiyat değiştirme gibi
// işlemlerin durumunu alır.
// =====================================================

export const selectRecurringMutationStatus = (state) =>
  selectRecurringState(state).mutationStatus;

// =====================================================
// 11.GÜN
// Forecast kayıtlarının yüklenme durumunu alır.
// =====================================================

export const selectForecastLoadStatus = (state) =>
  selectRecurringState(state).forecastLoadStatus;

// =====================================================
// 11.GÜN
// Recurring işlemlerinde oluşan hata mesajını alır.
// =====================================================

export const selectRecurringError = (state) =>
  selectRecurringState(state).error;

// =====================================================
// 11.GÜN
// Bütün recurring rule'lara ait forecast kayıtlarını
// tek bir liste halinde birleştirir.
//
// Böylece yaklaşan ödemeleri bütün abonelikler için
// tek yerde gösterebiliriz.
// =====================================================

export const selectAllForecasts = createSelector(
  [selectForecastsByRuleId],
  (forecastsByRuleId) => Object.values(forecastsByRuleId).flat(),
);

// =====================================================
// 11.GÜN - Yaklaşan ödemeler
//
// Sadece henüz ödenmemiş ve iptal edilmemiş forecast
// kayıtları yaklaşan ödeme listesine dahil edilir.
//
// Ödenen fatura tekrar bu listede görünmez.
// =====================================================

export const selectUpcomingForecasts = createSelector(
  [selectAllForecasts],
  (forecasts) =>
    forecasts
      .filter((forecast) => shouldShowInUpcomingPayments(forecast))
      .sort((firstForecast, secondForecast) =>
        firstForecast.dueDate.localeCompare(secondForecast.dueDate),
      ),
);

// =====================================================
// 11.GÜN - Geciken ödemeler
//
// Son ödeme tarihi geçmiş fakat henüz ödenmemiş
// forecast kayıtlarını bulur.
//
// overdue değeri burada güncel tarihe göre yeniden
// hesaplanır.
// =====================================================

export const selectOverdueForecasts = createSelector(
  [selectUpcomingForecasts],
  (forecasts) => {
    const todayDate = getTodayDateValue();

    return forecasts.filter((forecast) =>
      calculateOverdue({
        dueDate: forecast.dueDate,

        status: forecast.status,

        todayDate,
      }),
    );
  },
);

// =====================================================
// 11.GÜN
// Yaklaşan ödemelerin toplam tahmini tutarını hesaplar.
//
// Bu değer gerçek gider değildir.
// Sadece gelecekte beklenen ödeme yükünü gösterir.
// =====================================================

export const selectUpcomingForecastTotalMinor = createSelector(
  [selectUpcomingForecasts],
  (forecasts) =>
    forecasts.reduce(
      (total, forecast) => total + Number(forecast.estimatedAmountMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN
// Geciken ödemelerin toplam tahmini tutarını hesaplar.
// =====================================================

export const selectOverdueForecastTotalMinor = createSelector(
  [selectOverdueForecasts],
  (forecasts) =>
    forecasts.reduce(
      (total, forecast) => total + Number(forecast.estimatedAmountMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN - Tahmin / gerçek analizleri
//
// Ödenmiş forecast kayıtlarında tahmini tutar ile
// gerçek tutar arasındaki fark hesaplanır.
//
// Ayrıca her forecast kaydına ilgili gider/abonelik adı (ruleName) eklenir.
// =====================================================

export const selectForecastAccuracyAnalysis = createSelector(
  [selectAllForecasts, selectRecurringRules],
  (forecasts, rules) => {
    const rulesMap = new Map(rules.map((rule) => [rule.id, rule.name]));

    return forecasts
      .filter(
        (forecast) =>
          forecast.status === "paid" &&
          forecast.actualAmountMinor !== null &&
          forecast.actualAmountMinor !== undefined,
      )
      .map((forecast) => {
        const errorMinor = calculateForecastErrorMinor({
          estimatedAmountMinor: forecast.estimatedAmountMinor,

          actualAmountMinor: forecast.actualAmountMinor,
        });

        const errorPercent = calculateForecastErrorPercent({
          estimatedAmountMinor: forecast.estimatedAmountMinor,

          actualAmountMinor: forecast.actualAmountMinor,
        });

        return {
          ...forecast,

          ruleName: rulesMap.get(forecast.recurringRuleId) ?? "Düzenli Gider",

          errorMinor,

          errorPercent,
        };
      });
  },
);

// =====================================================
// 11.GÜN
// Belirli bir recurring rule için forecast kayıtlarını
// almak üzere yardımcı selector.
// =====================================================

export const selectForecastsForRule = (state, recurringRuleId) =>
  selectForecastsByRuleId(state)[recurringRuleId] ?? [];

// =====================================================
// 11.GÜN
// Her recurring rule için yaklaşan ilk ödeme bilgisini
// bulur.
//
// Bu değer kart veya liste üzerinde "Sonraki ödeme"
// göstermek için kullanılabilir.
// =====================================================

export const selectNextForecastByRule = createSelector(
  [selectRecurringRules, selectForecastsByRuleId],
  (rules, forecastsByRuleId) =>
    rules.reduce((result, rule) => {
      const forecasts = forecastsByRuleId[rule.id] ?? [];

      const upcomingForecasts = forecasts
        .filter((forecast) => shouldShowInUpcomingPayments(forecast))
        .sort((firstForecast, secondForecast) =>
          firstForecast.dueDate.localeCompare(secondForecast.dueDate),
        );

      result[rule.id] = upcomingForecasts[0] ?? null;

      return result;
    }, {}),
);