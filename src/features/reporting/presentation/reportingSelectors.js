import { createSelector } from "@reduxjs/toolkit";

import {
  calculateReportingPeriod,
  getReportingPeriodTitle,
} from "../domain/reportingPeriodCalculations";

// =====================================================
// 11.GÜN
// Reporting state'ine ulaşmak için kullanılan
// temel selector.
// =====================================================

const selectReportingState = (state) => state.reporting;

// =====================================================
// 11.GÜN
// Kullanıcının seçtiği bütün raporlama ayarlarını
// Redux state içerisinden alır.
// =====================================================

export const selectReportingSettings = (state) =>
  selectReportingState(state).settings;

// =====================================================
// 11.GÜN
// Kullanıcının seçtiği raporlama türünü alır.
//
// Olası değerler:
//
// calendarMonth
// customMonth
// creditCardCycle
// =====================================================

export const selectReportingMode = createSelector(
  [selectReportingSettings],
  (settings) => settings.mode,
);

// =====================================================
// 11.GÜN
// Özel finansal ay kullanılıyorsa başlangıç gününü alır.
//
// Örneğin:
//
// 25
//
// seçilmişse finansal ay her ayın 25'inde başlayacaktır.
// =====================================================

export const selectCustomMonthStartDay = createSelector(
  [selectReportingSettings],
  (settings) => Number(settings.customMonthStartDay ?? 1),
);

// =====================================================
// 11.GÜN
// Kredi kartı dönemi seçilmişse hangi kartın
// kullanılacağını Redux state içerisinden alır.
// =====================================================

export const selectReportingCreditCardId = createSelector(
  [selectReportingSettings],
  (settings) => settings.selectedCreditCardId ?? "",
);

// =====================================================
// 11.GÜN
// Raporlama ayarlarının Firestore'dan yüklenme
// durumunu verir.
//
// idle
// loading
// succeeded
// failed
// =====================================================

export const selectReportingLoadStatus = (state) =>
  selectReportingState(state).loadStatus;

// =====================================================
// 11.GÜN
// Kullanıcının yaptığı ayar değişikliğinin Firestore'a
// kaydedilme durumunu verir.
// =====================================================

export const selectReportingSaveStatus = (state) =>
  selectReportingState(state).saveStatus;

// =====================================================
// 11.GÜN
// Raporlama ayarlarıyla ilgili hata mesajını alır.
// =====================================================

export const selectReportingError = (state) =>
  selectReportingState(state).error;

// =====================================================
// 11.GÜN
// Kredi kartı dönemini hesaplayabilmek için
// ekstre kayıtlarını Redux içerisinden alır.
// =====================================================

const selectStatementPeriods = (state) => state.statements.items;

// =====================================================
// 11.GÜN
// Bugünün tarihini YYYY-MM-DD biçiminde oluşturur.
//
// Aktif finansal dönemi belirlerken referans tarih
// olarak bugünün tarihi kullanılır.
// =====================================================

function getTodayDateValue() {
  const today = new Date();

  const timezoneOffset = today.getTimezoneOffset() * 60 * 1000;

  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

// =====================================================
// 11.GÜN - Aktif raporlama dönemi
//
// Kullanıcının seçtiği ayarlara göre hangi tarih
// aralığının raporlarda kullanılacağını hesaplar.
//
// Örneğin:
//
// Takvim Ayı
// 01.08.2026 - 31.08.2026
//
// veya
//
// Özel Finansal Ay
// 25.07.2026 - 24.08.2026
//
// veya seçilen kredi kartının ekstre dönemi.
// =====================================================

export const selectActiveReportingPeriod = createSelector(
  [selectReportingSettings, selectStatementPeriods],
  (settings, statementPeriods) => {
    const referenceDate = getTodayDateValue();

    try {
      return calculateReportingPeriod({
        mode: settings.mode,

        referenceDate,

        customMonthStartDay: settings.customMonthStartDay,

        selectedCreditCardId: settings.selectedCreditCardId,

        statementPeriods,
      });
    } catch (error) {
      // =====================================================
      // 11.GÜN
      // Örneğin kullanıcı kredi kartı dönemi seçmiş ancak
      // o karta ait geçerli ekstre henüz oluşmamış olabilir.
      //
      // Böyle bir durumda uygulamanın tamamen hata vermesi
      // yerine dönem bilgisi boş döndürülür.
      // =====================================================

      return {
        mode: settings.mode,

        startDate: "",

        endDate: "",

        errorCode: error?.message ?? "REPORTING_PERIOD_ERROR",
      };
    }
  },
);

// =====================================================
// 11.GÜN
// Dashboard üzerinde gösterilecek dönem başlığını hazırlar.
//
// Örneğin:
//
// "Takvim Ayı"
// "Özel Finansal Ay"
// "Kredi Kartı Dönemi"
// =====================================================

export const selectActiveReportingPeriodTitle = createSelector(
  [selectReportingMode],
  (mode) => getReportingPeriodTitle(mode),
);

// =====================================================
// 11.GÜN
// Dashboard'un dönem başlığında kullanılacak tüm bilgileri
// tek bir selector içerisinde birleştirir.
//
// Component böylece hem dönem adını hem tarih aralığını
// ayrı ayrı hesaplamak zorunda kalmaz.
// =====================================================

export const selectActiveReportingPeriodSummary = createSelector(
  [selectActiveReportingPeriodTitle, selectActiveReportingPeriod],
  (title, period) => ({
    title,

    startDate: period.startDate ?? "",

    endDate: period.endDate ?? "",

    mode: period.mode,

    errorCode: period.errorCode ?? null,
  }),
);

// =====================================================
// 11.GÜN
// Aktif raporlama döneminin başarıyla hesaplanıp
// hesaplanamadığını kontrol eder.
//
// Hem başlangıç hem de bitiş tarihi varsa dönem
// kullanılabilir kabul edilir.
// =====================================================

export const selectHasValidReportingPeriod = createSelector(
  [selectActiveReportingPeriod],
  (period) => Boolean(period.startDate && period.endDate),
);
