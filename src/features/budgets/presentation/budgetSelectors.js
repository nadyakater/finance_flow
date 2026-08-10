import { createSelector } from "@reduxjs/toolkit";

import {
  calculateBudgetSummary,
  calculateSavingsRate,
  calculateSavingsTargetFromIncomePercent,
  calculateSavingsTargetProgressPercent,
  calculateSavingsTargetRemainingMinor,
} from "../domain/budgetCalculations";

import { isDateInsideReportingPeriod } from "../../reporting/domain/reportingPeriodCalculations";

import { selectActiveReportingPeriod } from "../../reporting/presentation/reportingSelectors";

import {
  selectNetBalanceMinor,
  selectTotalIncomeMinor,
  selectTransactions,
  selectTransactionsInActiveReportingPeriod,
} from "../../transactions/presentation/transactionSelectors";

// =====================================================
// 11.GÜN - Bütçe selectorları
//
// Bütçe ve tasarruf hedefleriyle ilgili hesaplamalar
// Redux state içerisindeki veriler kullanılarak yapılır.
//
// Bu dosyada:
//
// - aktif dönem bütçeleri,
// - kategori bütçesi kullanımı,
// - parent kategori / descendant hesabı,
// - refund sonrası kullanılan bütçe,
// - kalan bütçe,
// - kullanım yüzdesi,
// - rollover,
// - tasarruf hedefi ilerlemesi
//
// hesaplanır.
// =====================================================

// =====================================================
// 11.GÜN
// Budget state'e ulaşmak için temel selector.
// =====================================================

const selectBudgetState = (state) => state.budgets;

// =====================================================
// 11.GÜN
// Kullanıcının bütün kategori bütçelerini alır.
// =====================================================

export const selectBudgets = (state) => selectBudgetState(state).budgets;

// =====================================================
// 11.GÜN
// Kullanıcının bütün tasarruf hedeflerini alır.
// =====================================================

export const selectSavingsTargets = (state) =>
  selectBudgetState(state).savingsTargets;

// =====================================================
// 11.GÜN
// Bütçelerin Firestore'dan yüklenme durumunu verir.
// =====================================================

export const selectBudgetLoadStatus = (state) =>
  selectBudgetState(state).budgetLoadStatus;

// =====================================================
// 11.GÜN
// Tasarruf hedeflerinin yüklenme durumunu verir.
// =====================================================

export const selectSavingsTargetLoadStatus = (state) =>
  selectBudgetState(state).savingsTargetLoadStatus;

// =====================================================
// 11.GÜN
// Bütçe ekleme ve güncelleme işlemlerinin durumunu verir.
// =====================================================

export const selectBudgetMutationStatus = (state) =>
  selectBudgetState(state).mutationStatus;

// =====================================================
// 11.GÜN
// Bütçe işlemlerinde oluşan hata mesajını verir.
// =====================================================

export const selectBudgetError = (state) => selectBudgetState(state).error;

// =====================================================
// 11.GÜN
// Sadece aktif durumda olan bütçeleri getirir.
// =====================================================

export const selectEnabledBudgets = createSelector(
  [selectBudgets],

  (budgets) => budgets.filter((budget) => budget.isActive),
);

// =====================================================
// 11.GÜN
// Sadece aktif durumdaki tasarruf hedeflerini getirir.
// =====================================================

export const selectEnabledSavingsTargets = createSelector(
  [selectSavingsTargets],

  (savingsTargets) => savingsTargets.filter((target) => target.isActive),
);

// =====================================================
// 11.GÜN
// Aktif finansal döneme ait bütçeleri bulur.
// =====================================================

export const selectBudgetsForActivePeriod = createSelector(
  [selectEnabledBudgets, selectActiveReportingPeriod],

  (budgets, activeReportingPeriod) => {
    const periodStart = activeReportingPeriod?.startDate ?? "";

    const periodEnd = activeReportingPeriod?.endDate ?? "";

    if (!periodStart || !periodEnd) {
      return [];
    }

    return budgets.filter(
      (budget) =>
        budget.periodStart === periodStart && budget.periodEnd === periodEnd,
    );
  },
);

// =====================================================
// 11.GÜN
// Aktif döneme ait tasarruf hedeflerini bulur.
// =====================================================

export const selectSavingsTargetsForActivePeriod = createSelector(
  [selectEnabledSavingsTargets, selectActiveReportingPeriod],

  (savingsTargets, activeReportingPeriod) => {
    const periodStart = activeReportingPeriod?.startDate ?? "";

    const periodEnd = activeReportingPeriod?.endDate ?? "";

    if (!periodStart || !periodEnd) {
      return [];
    }

    return savingsTargets.filter(
      (target) =>
        target.periodStart === periodStart && target.periodEnd === periodEnd,
    );
  },
);

// =====================================================
// 11.GÜN
// Bir gider transaction'ının iade sonrası kalan
// gerçek gider tutarını hesaplar.
//
// Örneğin:
//
// Gider:
// 1.000 TL
//
// İade:
// 200 TL
//
// Bütçe kullanımı:
// 800 TL
// =====================================================

function getRemainingExpenseMinor(transaction) {
  const amountMinor = Number(transaction.amountMinor ?? 0);

  const refundedMinor = Number(transaction.refundedMinor ?? 0);

  return Math.max(amountMinor - refundedMinor, 0);
}

// =====================================================
// 11.GÜN
// Çok satırlı giderlerde transaction seviyesindeki
// iadeyi gider satırlarına orantılı dağıtır.
// =====================================================

function allocateRefundToLines(transaction) {
  const lines = Array.isArray(transaction.lines) ? transaction.lines : [];

  if (lines.length === 0) {
    return [];
  }

  const transactionAmountMinor = Number(transaction.amountMinor ?? 0);

  const remainingExpenseMinor = getRemainingExpenseMinor(transaction);

  if (transactionAmountMinor <= 0) {
    return lines.map((line) => ({
      ...line,

      budgetNetAmountMinor: 0,
    }));
  }

  if (remainingExpenseMinor === transactionAmountMinor) {
    return lines.map((line) => ({
      ...line,

      budgetNetAmountMinor: Number(
        line.netAmountMinor ?? line.grossAmountMinor ?? 0,
      ),
    }));
  }

  let allocatedTotalMinor = 0;

  return lines.map((line, index) => {
    const lineNetAmountMinor = Number(
      line.netAmountMinor ?? line.grossAmountMinor ?? 0,
    );

    const isLastLine = index === lines.length - 1;

    const budgetNetAmountMinor = isLastLine
      ? Math.max(remainingExpenseMinor - allocatedTotalMinor, 0)
      : Math.round(
          (lineNetAmountMinor * remainingExpenseMinor) / transactionAmountMinor,
        );

    allocatedTotalMinor += budgetNetAmountMinor;

    return {
      ...line,

      budgetNetAmountMinor,
    };
  });
}

// =====================================================
// 11.GÜN
// Eski tek kategorili transaction kayıtlarının
// category path bilgisini güvenli şekilde oluşturur.
// =====================================================

function getTransactionCategoryPathIds(transaction) {
  if (
    Array.isArray(transaction.categoryPathIds) &&
    transaction.categoryPathIds.length > 0
  ) {
    return transaction.categoryPathIds;
  }

  if (transaction.categoryId) {
    return [transaction.categoryId];
  }

  return [];
}

// =====================================================
// 11.GÜN
// Transaction tarihini YYYY-MM-DD biçiminde bulur.
// =====================================================

function getTransactionDateValue(transaction) {
  if (transaction.transactionDate) {
    return transaction.transactionDate;
  }

  if (typeof transaction.createdAtUtc === "string") {
    return transaction.createdAtUtc.slice(0, 10);
  }

  return "";
}

// =====================================================
// 11.GÜN
// Transaction içerisindeki giderleri kategori bazlı
// bütçe kalemlerine dönüştürür.
//
// Gelir, iade ve transfer gibi kayıtlar burada
// doğrudan gider olarak değerlendirilmez.
// =====================================================

function getBudgetExpenseItems(transaction) {
  if (transaction.transactionType !== "Gider") {
    return [];
  }

  if (Array.isArray(transaction.lines) && transaction.lines.length > 0) {
    const adjustedLines = allocateRefundToLines(transaction);

    return adjustedLines.map((line) => ({
      categoryId: line.categoryId ?? "",

      categoryPathIds:
        Array.isArray(line.categoryPathIds) && line.categoryPathIds.length > 0
          ? line.categoryPathIds
          : line.categoryId
            ? [line.categoryId]
            : [],

      amountMinor: Number(line.budgetNetAmountMinor ?? 0),
    }));
  }

  return [
    {
      categoryId: transaction.categoryId ?? "",

      categoryPathIds: getTransactionCategoryPathIds(transaction),

      amountMinor: getRemainingExpenseMinor(transaction),
    },
  ];
}

// =====================================================
// 11.GÜN
// Bir gider kaleminin bütçe kategorisiyle eşleşip
// eşleşmediğini kontrol eder.
//
// includeDescendants = true:
//
// Parent kategori ve bütün alt kategoriler dahil.
//
// includeDescendants = false:
//
// Yalnız doğrudan seçilen kategori dahil.
// =====================================================

function doesExpenseItemMatchBudget({ expenseItem, budget }) {
  if (!expenseItem || !budget?.categoryId) {
    return false;
  }

  if (budget.includeDescendants) {
    return expenseItem.categoryPathIds.includes(budget.categoryId);
  }

  return expenseItem.categoryId === budget.categoryId;
}

// =====================================================
// 11.GÜN
// Belirli bir transaction listesinden bütçeye ait
// kullanılan toplam tutarı hesaplar.
// =====================================================

function calculateSpentForBudget({ budget, transactions }) {
  return transactions.reduce((totalSpentMinor, transaction) => {
    // =====================================================
    // 11.GÜN
    // Sadece gerçek giderler bütçeyi kullanır.
    //
    // Transfer bütçeyi etkilemez.
    // =====================================================

    if (transaction.transactionType !== "Gider") {
      return totalSpentMinor;
    }

    const expenseItems = getBudgetExpenseItems(transaction);

    const matchingAmountMinor = expenseItems.reduce(
      (transactionTotalMinor, expenseItem) => {
        if (
          !doesExpenseItemMatchBudget({
            expenseItem,
            budget,
          })
        ) {
          return transactionTotalMinor;
        }

        return transactionTotalMinor + Number(expenseItem.amountMinor ?? 0);
      },
      0,
    );

    return totalSpentMinor + matchingAmountMinor;
  }, 0);
}

// =====================================================
// 11.GÜN - 3.18 ROLLOVER
//
// Her bütçenin kendi dönemine ait transactionları
// bulmak için yardımcı fonksiyon.
//
// Böylece geçmiş dönem bütçesinin ne kadar
// kullanıldığı otomatik hesaplanabilir.
// =====================================================

function getTransactionsForBudgetPeriod({ budget, transactions }) {
  if (!budget?.periodStart || !budget?.periodEnd) {
    return [];
  }

  return transactions.filter((transaction) => {
    const transactionDate = getTransactionDateValue(transaction);

    if (!transactionDate) {
      return false;
    }

    return isDateInsideReportingPeriod({
      dateValue: transactionDate,

      startDate: budget.periodStart,

      endDate: budget.periodEnd,
    });
  });
}

// =====================================================
// 11.GÜN - 3.18 ROLLOVER
//
// Geçmişte oluşturulan HER bütçe için:
//
// - temel bütçe,
// - daha önce devreden rollover,
// - kullanılabilir bütçe,
// - kullanılan tutar,
// - kalan tutar
//
// yeniden hesaplanır.
//
// Bu hesaplama sayesinde kullanıcı rollover miktarını
// artık elle yazmak zorunda kalmaz.
// =====================================================

export const selectHistoricalBudgetSummaries = createSelector(
  [selectEnabledBudgets, selectTransactions],

  (budgets, transactions) =>
    budgets.map((budget) => {
      const transactionsForPeriod = getTransactionsForBudgetPeriod({
        budget,
        transactions,
      });

      const spentMinor = calculateSpentForBudget({
        budget,
        transactions: transactionsForPeriod,
      });

      const summary = calculateBudgetSummary({
        budgetMinor: budget.budgetAmountMinor,

        expenseMinor: spentMinor,

        refundMinor: 0,

        rolloverMinor: budget.rolloverAmountMinor ?? 0,
      });

      return {
        ...budget,

        ...summary,

        rolloverSourceBudgetId: budget.rolloverSourceBudgetId ?? "",
      };
    }),
);

// =====================================================
// 11.GÜN - 3.18 ROLLOVER
//
// Aktif dönemden ÖNCE bitmiş bütçeleri rollover
// kaynağı olarak listeler.
//
// Gelecekteki veya mevcut dönemin bütçesi kaynak
// olarak seçilemez.
//
// En yakın geçmiş dönem önce gösterilir.
// =====================================================

export const selectBudgetRolloverCandidates = createSelector(
  [selectHistoricalBudgetSummaries, selectActiveReportingPeriod],

  (budgetSummaries, activeReportingPeriod) => {
    const activeStartDate = activeReportingPeriod?.startDate ?? "";

    if (!activeStartDate) {
      return [];
    }

    return budgetSummaries
      .filter(
        (budget) =>
          Boolean(budget.periodEnd) && budget.periodEnd < activeStartDate,
      )
      .sort((firstBudget, secondBudget) =>
        secondBudget.periodEnd.localeCompare(firstBudget.periodEnd),
      );
  },
);

// =====================================================
// 11.GÜN
// Aktif finansal dönem bütçelerinin kullanımını
// hesaplar.
// =====================================================

export const selectActiveBudgetSummaries = createSelector(
  [selectBudgetsForActivePeriod, selectTransactionsInActiveReportingPeriod],

  (budgets, transactions) =>
    budgets.map((budget) => {
      const spentMinor = calculateSpentForBudget({
        budget,
        transactions,
      });

      const summary = calculateBudgetSummary({
        budgetMinor: budget.budgetAmountMinor,

        expenseMinor: spentMinor,

        refundMinor: 0,

        rolloverMinor: budget.rolloverAmountMinor ?? 0,
      });

      return {
        ...budget,

        ...summary,

        rolloverSourceBudgetId: budget.rolloverSourceBudgetId ?? "",
      };
    }),
);

// =====================================================
// 11.GÜN
// Aktif dönemde tanımlanan toplam temel bütçeyi verir.
// =====================================================

export const selectTotalBaseBudgetMinor = createSelector(
  [selectActiveBudgetSummaries],

  (budgetSummaries) =>
    budgetSummaries.reduce(
      (total, budget) => total + Number(budget.baseBudgetMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN
// Aktif döneme devreden toplam rollover.
// =====================================================

export const selectTotalBudgetRolloverMinor = createSelector(
  [selectActiveBudgetSummaries],

  (budgetSummaries) =>
    budgetSummaries.reduce(
      (total, budget) => total + Number(budget.rolloverMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN
// Temel bütçe + rollover toplamı.
// =====================================================

export const selectTotalEffectiveBudgetMinor = createSelector(
  [selectActiveBudgetSummaries],

  (budgetSummaries) =>
    budgetSummaries.reduce(
      (total, budget) => total + Number(budget.effectiveBudgetMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN
// Aktif bütçelerde izlenen toplam kullanım.
// =====================================================

export const selectTotalTrackedBudgetSpentMinor = createSelector(
  [selectActiveBudgetSummaries],

  (budgetSummaries) =>
    budgetSummaries.reduce(
      (total, budget) => total + Number(budget.spentMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN
// Aktif bütçelerin toplam kalan tutarı.
// =====================================================

export const selectTotalBudgetRemainingMinor = createSelector(
  [selectActiveBudgetSummaries],

  (budgetSummaries) =>
    budgetSummaries.reduce(
      (total, budget) => total + Number(budget.remainingMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN
// Limiti aşılmış bütçeler.
// =====================================================

export const selectExceededBudgets = createSelector(
  [selectActiveBudgetSummaries],

  (budgetSummaries) => budgetSummaries.filter((budget) => budget.exceeded),
);

// =====================================================
// 11.GÜN
// Budget ID ile hesaplanmış bütçe özeti bulunur.
// =====================================================

export const selectBudgetSummaryById = (state, budgetId) =>
  selectActiveBudgetSummaries(state).find((budget) => budget.id === budgetId) ??
  null;

// =====================================================
// 11.GÜN - Tasarruf oranı
//
// Net nakit / Toplam gelir * 100
//
// Gelir yoksa null.
// =====================================================

export const selectCurrentSavingsRate = createSelector(
  [selectTotalIncomeMinor, selectNetBalanceMinor],

  (totalIncomeMinor, netBalanceMinor) =>
    calculateSavingsRate({
      totalIncomeMinor,

      netCashFlowMinor: netBalanceMinor,
    }),
);

// =====================================================
// 11.GÜN
// Aktif dönemin tasarruf hedefi ilerlemeleri.
// =====================================================

export const selectSavingsTargetSummaries = createSelector(
  [
    selectSavingsTargetsForActivePeriod,
    selectTotalIncomeMinor,
    selectNetBalanceMinor,
  ],

  (savingsTargets, totalIncomeMinor, netBalanceMinor) =>
    savingsTargets.map((target) => {
      let calculatedTargetMinor = 0;

      if (target.targetType === "amount") {
        calculatedTargetMinor = Number(target.targetAmountMinor ?? 0);
      }

      if (target.targetType === "incomePercent") {
        calculatedTargetMinor = calculateSavingsTargetFromIncomePercent({
          totalIncomeMinor,

          targetPercent: target.targetPercent,
        });
      }

      const remainingMinor = calculateSavingsTargetRemainingMinor({
        targetMinor: calculatedTargetMinor,

        netCashFlowMinor: netBalanceMinor,
      });

      const progressPercent = calculateSavingsTargetProgressPercent({
        targetMinor: calculatedTargetMinor,

        netCashFlowMinor: netBalanceMinor,
      });

      return {
        ...target,

        calculatedTargetMinor,

        currentSavingsMinor: Number(netBalanceMinor ?? 0),

        remainingMinor,

        progressPercent,

        completed:
          calculatedTargetMinor > 0 &&
          Number(netBalanceMinor ?? 0) >= calculatedTargetMinor,
      };
    }),
);

// =====================================================
// 11.GÜN
// İlk aktif tasarruf hedefi.
// =====================================================

export const selectPrimarySavingsTarget = createSelector(
  [selectSavingsTargetSummaries],

  (savingsTargets) => savingsTargets[0] ?? null,
);

// =====================================================
// 11.GÜN
// Aktif dönemde bütçe var mı?
// =====================================================

export const selectHasActivePeriodBudget = createSelector(
  [selectBudgetsForActivePeriod],

  (budgets) => budgets.length > 0,
);

// =====================================================
// 11.GÜN
// Aktif dönemde tasarruf hedefi var mı?
// =====================================================

export const selectHasActiveSavingsTarget = createSelector(
  [selectSavingsTargetsForActivePeriod],

  (savingsTargets) => savingsTargets.length > 0,
);
