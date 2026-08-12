import { createSelector } from "@reduxjs/toolkit";

import { selectActiveReportingPeriod } from "../../reporting/presentation/reportingSelectors";

import { selectTransactions } from "../../transactions/presentation/transactionSelectors";

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

export const selectTotalIncome = (state) =>
  state.dashboard.totalIncome;

// =====================================================
// 12.GÜN - 3.19
//
// Net gider bilgisini getirir.
// =====================================================

export const selectTotalExpense = (state) =>
  state.dashboard.totalExpense;

// =====================================================
// 12.GÜN - 3.19
//
// Toplam iade bilgisini getirir.
// =====================================================

export const selectTotalRefunds = (state) =>
  state.dashboard.totalRefunds;

// =====================================================
// 12.GÜN - 3.19
//
// Net nakit akışını getirir.
// =====================================================

export const selectNetCashFlow = (state) =>
  state.dashboard.netCashFlow;

// =====================================================
// 12.GÜN - 3.19
//
// Tasarruf oranını getirir.
// =====================================================

export const selectSavingsRate = (state) =>
  state.dashboard.savingsRate;

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard yüklenme durumunu getirir.
// =====================================================

export const selectDashboardStatus = (state) =>
  state.dashboard.status;

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard hata bilgisini getirir.
// =====================================================

export const selectDashboardError = (state) =>
  state.dashboard.error;

// 12.GÜN - 3.20 - Dashboard filtrelerinin tamamını Redux state içerisinden getirir.
export const selectDashboardFilters = (state) =>
  state.dashboard.filters;

// 12.GÜN - 3.20 - Grafikte seçilen gelir veya gider türünü Redux state içerisinden getirir.
export const selectSelectedChartTransactionType = (state) =>
  state.dashboard.selectedChartTransactionType;

function getTransactionDate(transaction) {
  if (transaction.transactionDate) {
    return transaction.transactionDate;
  }

  if (typeof transaction.createdAtUtc === "string") {
    return transaction.createdAtUtc.slice(0, 10);
  }

  return "";
}

function matchesCategory(transaction, categoryId) {
  if (!categoryId) {
    return true;
  }

  if (transaction.categoryId === categoryId) {
    return true;
  }

  if (
    Array.isArray(transaction.categoryPathIds) &&
    transaction.categoryPathIds.includes(categoryId)
  ) {
    return true;
  }

  const lines = Array.isArray(transaction.lines)
    ? transaction.lines
    : [];

  return lines.some((line) => {
    if (line.categoryId === categoryId) {
      return true;
    }

    return (
      Array.isArray(line.categoryPathIds) &&
      line.categoryPathIds.includes(categoryId)
    );
  });
}

function matchesProduct(transaction, productId) {
  if (!productId) {
    return true;
  }

  const lines = Array.isArray(transaction.lines)
    ? transaction.lines
    : [];

  return lines.some(
    (line) => line.productId === productId,
  );
}

function matchesBrand(transaction, brandId) {
  if (!brandId) {
    return true;
  }

  const lines = Array.isArray(transaction.lines)
    ? transaction.lines
    : [];

  return lines.some(
    (line) => line.brandId === brandId,
  );
}

// 12.GÜN - 3.20 - Dashboard filtrelerine uygun finansal kayıtlar tek bir selector içerisinde hazırlanır.
export const selectFilteredDashboardTransactions =
  createSelector(
    [
      selectTransactions,
      selectDashboardFilters,
      selectActiveReportingPeriod,
    ],
    (
      transactions,
      filters,
      activeReportingPeriod,
    ) => {
      const startDate =
        filters.useActiveReportingPeriod
          ? activeReportingPeriod?.startDate ?? ""
          : filters.startDate;

      const endDate =
        filters.useActiveReportingPeriod
          ? activeReportingPeriod?.endDate ?? ""
          : filters.endDate;

      return transactions.filter(
        (transaction) => {
          const transactionDate =
            getTransactionDate(transaction);

          if (
            startDate &&
            transactionDate &&
            transactionDate < startDate
          ) {
            return false;
          }

          if (
            endDate &&
            transactionDate &&
            transactionDate > endDate
          ) {
            return false;
          }

          if (
            startDate &&
            !transactionDate
          ) {
            return false;
          }

          if (
            endDate &&
            !transactionDate
          ) {
            return false;
          }

          if (
            filters.creditCardId &&
            transaction.creditCardId !==
              filters.creditCardId
          ) {
            return false;
          }

          if (
            filters.merchantId &&
            transaction.merchantId !==
              filters.merchantId
          ) {
            return false;
          }

          if (
            filters.branchId &&
            transaction.branchId !==
              filters.branchId
          ) {
            return false;
          }

          if (
            filters.paymentMethod &&
            transaction.paymentMethod !==
              filters.paymentMethod
          ) {
            return false;
          }

          if (
            !matchesCategory(
              transaction,
              filters.categoryId,
            )
          ) {
            return false;
          }

          if (
            !matchesBrand(
              transaction,
              filters.brandId,
            )
          ) {
            return false;
          }

          if (
            !matchesProduct(
              transaction,
              filters.productId,
            )
          ) {
            return false;
          }

          return true;
        },
      );
    },
  );

// 12.GÜN - 3.20 - Grafikte seçilen gelir veya gider türüne ait kayıtlar drill-down listesi için hazırlanır.
export const selectDashboardDrillDownTransactions =
  createSelector(
    [
      selectFilteredDashboardTransactions,
      selectSelectedChartTransactionType,
    ],
    (
      transactions,
      selectedTransactionType,
    ) => {
      if (!selectedTransactionType) {
        return [];
      }

      return transactions.filter(
        (transaction) =>
          transaction.transactionType ===
          selectedTransactionType,
      );
    },
  );