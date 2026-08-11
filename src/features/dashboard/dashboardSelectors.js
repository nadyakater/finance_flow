// =====================================================
// 12.GÜN - 3.19
//
// Dashboard verilerini Redux store içerisinden
// seçmek için kullanılan selectorlar.
// =====================================================

// =====================================================
// 12.GÜN - 3.19
//
// Toplam gelir bilgisini getirir.
// =====================================================

export const selectTotalIncome = (
  state,
) =>
  state.dashboard.totalIncome;

// =====================================================
// 12.GÜN - 3.19
//
// Net gider bilgisini getirir.
// =====================================================

export const selectTotalExpense = (
  state,
) =>
  state.dashboard.totalExpense;

// =====================================================
// 12.GÜN - 3.19
//
// Toplam iade bilgisini getirir.
// =====================================================

export const selectTotalRefunds = (
  state,
) =>
  state.dashboard.totalRefunds;

// =====================================================
// 12.GÜN - 3.19
//
// Net nakit akışını getirir.
// =====================================================

export const selectNetCashFlow = (
  state,
) =>
  state.dashboard.netCashFlow;

// =====================================================
// 12.GÜN - 3.19
//
// Tasarruf oranını getirir.
// =====================================================

export const selectSavingsRate = (
  state,
) =>
  state.dashboard.savingsRate;

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard yüklenme durumunu getirir.
// =====================================================

export const selectDashboardStatus = (
  state,
) =>
  state.dashboard.status;

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard hata bilgisini getirir.
// =====================================================

export const selectDashboardError = (
  state,
) =>
  state.dashboard.error;