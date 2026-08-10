import { createSelector } from "@reduxjs/toolkit";

import { isDateInsideReportingPeriod } from "../../reporting/domain/reportingPeriodCalculations";

import { selectActiveReportingPeriod } from "../../reporting/presentation/reportingSelectors";

const selectTransactionState = (state) => state.transactions;

// =====================================================
// Temel işlem selectorları
// =====================================================

export const selectTransactions = (state) =>
  selectTransactionState(state).items;

export const selectTransactionLoadStatus = (state) =>
  selectTransactionState(state).loadStatus;

export const selectTransactionSaveStatus = (state) =>
  selectTransactionState(state).saveStatus;

export const selectTransactionRefundStatus = (state) =>
  selectTransactionState(state).refundStatus;

export const selectTransactionDeleteStatus = (state) =>
  selectTransactionState(state).deleteStatus;

export const selectTransactionError = (state) =>
  selectTransactionState(state).error;

export const selectTransactionSuccessMessage = (state) =>
  selectTransactionState(state).successMessage;

// =====================================================
// İade sonrası kalan gider
// =====================================================

function getRemainingExpenseMinor(transaction) {
  const amountMinor = Number(transaction.amountMinor ?? 0);

  const refundedMinor = Number(transaction.refundedMinor ?? 0);

  return Math.max(amountMinor - refundedMinor, 0);
}

function getTransactionDateValue(transaction) {
  const dateValue = transaction.transactionDate || transaction.createdAtUtc;

  const timestamp = new Date(dateValue).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

// İade satır bazlı değilse, toplam iade tutarı
// işlem satırlarına orantılı olarak dağıtılır.
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

      adjustedNetAmountMinor: 0,
    }));
  }

  if (remainingExpenseMinor === transactionAmountMinor) {
    return lines.map((line) => ({
      ...line,

      adjustedNetAmountMinor: Number(line.netAmountMinor ?? 0),
    }));
  }

  let allocatedTotalMinor = 0;

  return lines.map((line, index) => {
    const lineNetAmountMinor = Number(line.netAmountMinor ?? 0);

    const isLastLine = index === lines.length - 1;

    const adjustedNetAmountMinor = isLastLine
      ? Math.max(remainingExpenseMinor - allocatedTotalMinor, 0)
      : Math.round(
          (lineNetAmountMinor * remainingExpenseMinor) / transactionAmountMinor,
        );

    allocatedTotalMinor += adjustedNetAmountMinor;

    return {
      ...line,

      adjustedNetAmountMinor,
    };
  });
}

// =====================================================
// Finansal özet selectorları
// =====================================================

// =====================================================
// 11.GÜN - Aktif finansal döneme ait işlemler
//
// Kullanıcının seçtiği raporlama dönemine göre yalnızca
// ilgili tarih aralığındaki gelir, gider ve iade kayıtları
// finansal özet hesaplarına dahil edilir.
//
// Önemli:
// İşlemlerin transactionDate değerleri değiştirilmez.
// Sadece raporlamada hangi kayıtların kullanılacağı filtrelenir.
// =====================================================

export const selectTransactionsInActiveReportingPeriod = createSelector(
  [selectTransactions, selectActiveReportingPeriod],

  (transactions, activeReportingPeriod) => {
    const startDate = activeReportingPeriod?.startDate ?? "";
    const endDate = activeReportingPeriod?.endDate ?? "";

    // 11.GÜN - Dönem henüz hesaplanamadıysa yanlış bir toplam
    // göstermek yerine finansal özet için boş liste döndürülür.
    if (!startDate || !endDate) {
      return [];
    }

    return transactions.filter((transaction) => {
      // 11.GÜN - Öncelikle kullanıcının gerçek işlem tarihi kullanılır.
      // Eski kayıtlarda transactionDate yoksa createdAtUtc içinden
      // yalnızca YYYY-MM-DD kısmı yedek tarih olarak alınır.
      const transactionDate =
        transaction.transactionDate ||
        (typeof transaction.createdAtUtc === "string"
          ? transaction.createdAtUtc.slice(0, 10)
          : "");

      return isDateInsideReportingPeriod({
        dateValue: transactionDate,
        startDate,
        endDate,
      });
    });
  },
);

// =====================================================
// 11.GÜN
// Toplam gelir artık bütün zamanların gelirini değil,
// yalnızca aktif finansal dönem içindeki gelirleri toplar.
// =====================================================

export const selectTotalIncomeMinor = createSelector(
  [selectTransactionsInActiveReportingPeriod],

  (transactions) =>
    transactions
      .filter((transaction) => transaction.transactionType === "Gelir")
      .reduce(
        (total, transaction) => total + Number(transaction.amountMinor ?? 0),
        0,
      ),
);

// =====================================================
// 11.GÜN
// Brüt gider hesabı da aktif finansal döneme göre yapılır.
// =====================================================

export const selectGrossExpenseMinor = createSelector(
  [selectTransactionsInActiveReportingPeriod],

  (transactions) =>
    transactions
      .filter((transaction) => transaction.transactionType === "Gider")
      .reduce(
        (total, transaction) => total + Number(transaction.amountMinor ?? 0),
        0,
      ),
);

// =====================================================
// 11.GÜN
// İade toplamında yalnızca aktif finansal döneme ait
// iade kayıtları kullanılır.
// =====================================================

export const selectTotalRefundMinor = createSelector(
  [selectTransactionsInActiveReportingPeriod],

  (transactions) =>
    transactions
      .filter((transaction) => transaction.transactionType === "İade")
      .reduce(
        (total, transaction) => total + Number(transaction.amountMinor ?? 0),
        0,
      ),
);

// =====================================================
// 11.GÜN
// Net gider, seçilen finansal dönem içindeki giderlerden
// yapılmış iadeler düşülerek hesaplanır.
// =====================================================

export const selectNetExpenseMinor = createSelector(
  [selectTransactionsInActiveReportingPeriod],

  (transactions) =>
    transactions
      .filter((transaction) => transaction.transactionType === "Gider")
      .reduce(
        (total, transaction) => total + getRemainingExpenseMinor(transaction),
        0,
      ),
);

// =====================================================
// 11.GÜN
// Net bakiye de aktif dönem gelirinden aktif dönem
// giderinin çıkarılmasıyla oluşur.
// =====================================================

export const selectNetBalanceMinor = createSelector(
  [selectTotalIncomeMinor, selectNetExpenseMinor],

  (totalIncomeMinor, netExpenseMinor) => totalIncomeMinor - netExpenseMinor,
);

// =====================================================
// Ürün satın alma geçmişi
// =====================================================

const selectProductId = (_state, productId) => productId;

export const selectProductPurchaseHistory = createSelector(
  [selectTransactions, selectProductId],

  (transactions, productId) => {
    if (!productId) {
      return [];
    }

    return transactions
      .filter((transaction) => transaction.transactionType === "Gider")
      .flatMap((transaction) => {
        const adjustedLines = allocateRefundToLines(transaction);

        return adjustedLines
          .filter((line) => line.productId === productId)
          .map((line) => {
            const normalizedQuantity = Number(line.normalizedQuantity ?? 0);

            const adjustedNetAmountMinor = Number(
              line.adjustedNetAmountMinor ?? 0,
            );

            const normalizedUnitPriceMinor =
              normalizedQuantity > 0
                ? Math.round(adjustedNetAmountMinor / normalizedQuantity)
                : 0;

            return {
              transactionId: transaction.id,

              transactionDate:
                transaction.transactionDate || transaction.createdAtUtc,

              merchantId: transaction.merchantId ?? "",

              merchantName: transaction.merchantName ?? "",

              branchId: transaction.branchId ?? "",

              branchName: transaction.branchName ?? "",

              productId: line.productId ?? "",

              productName: line.productName ?? "",

              brandId: line.brandId ?? "",

              brandName: line.brandName ?? "",

              purchaseQuantity: Number(line.purchaseQuantity ?? 0),

              unitCount: Number(line.unitCount ?? 0),

              unitSize: Number(line.unitSize ?? 0),

              unitType: line.unitType ?? "",

              normalizedQuantity,

              normalizedUnit: line.normalizedUnit ?? "",

              netAmountMinor: adjustedNetAmountMinor,

              normalizedUnitPriceMinor,
            };
          });
      })
      .sort(
        (firstPurchase, secondPurchase) =>
          getTransactionDateValue(secondPurchase) -
          getTransactionDateValue(firstPurchase),
      );
  },
);

function calculateMedian(values) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort(
    (firstValue, secondValue) => firstValue - secondValue,
  );

  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex];
  }

  return Math.round(
    (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2,
  );
}

// =====================================================
// Ürün fiyat analizi
// =====================================================

export const selectProductPriceAnalysis = createSelector(
  [selectProductPurchaseHistory],

  (purchaseHistory) => {
    const purchasesByUnit = purchaseHistory.reduce(
      (groupedPurchases, purchase) => {
        const normalizedUnit = purchase.normalizedUnit;

        if (!normalizedUnit || purchase.normalizedUnitPriceMinor <= 0) {
          return groupedPurchases;
        }

        if (!groupedPurchases[normalizedUnit]) {
          groupedPurchases[normalizedUnit] = [];
        }

        groupedPurchases[normalizedUnit].push(purchase);

        return groupedPurchases;
      },
      {},
    );

    return Object.entries(purchasesByUnit).map(
      ([normalizedUnit, purchases]) => {
        const prices = purchases.map(
          (purchase) => purchase.normalizedUnitPriceMinor,
        );

        const totalPriceMinor = prices.reduce(
          (total, priceMinor) => total + priceMinor,
          0,
        );

        const lastPurchase = purchases[0];

        const previousPurchase = purchases[1];

        const previousPriceMinor =
          previousPurchase?.normalizedUnitPriceMinor ?? 0;

        const priceChangePercent =
          previousPriceMinor > 0
            ? Number(
                (
                  ((lastPurchase.normalizedUnitPriceMinor -
                    previousPriceMinor) /
                    previousPriceMinor) *
                  100
                ).toFixed(2),
              )
            : null;

        return {
          normalizedUnit,

          purchaseCount: purchases.length,

          minPriceMinor: Math.min(...prices),

          maxPriceMinor: Math.max(...prices),

          averagePriceMinor: Math.round(totalPriceMinor / prices.length),

          medianPriceMinor: calculateMedian(prices),

          lastPriceMinor: lastPurchase.normalizedUnitPriceMinor,

          previousPriceMinor,

          priceChangePercent,

          lastPurchaseDate: lastPurchase.transactionDate,
        };
      },
    );
  },
);

// =====================================================
// 8.GÜN
// Yakıt satın alma geçmişi
// =====================================================

export const selectFuelPurchaseHistory = createSelector(
  [selectTransactions],

  (transactions) =>
    transactions
      .filter((transaction) => transaction.transactionType === "Gider")
      .flatMap((transaction) => {
        const adjustedLines = allocateRefundToLines(transaction);

        return adjustedLines
          .filter((line) => line.productType === "fuel")
          .map((line) => ({
            transactionId: transaction.id,

            transactionDate:
              transaction.transactionDate || transaction.createdAtUtc,

            merchantName: transaction.merchantName ?? "",

            branchName: transaction.branchName ?? "",

            fuelType: line.fuelType ?? "other",

            liters: Number(line.liters ?? line.normalizedQuantity ?? 0),

            unitPriceMinor: Number(
              line.fuelUnitPriceMinor ?? line.normalizedUnitPriceMinor ?? 0,
            ),

            totalMinor: Number(
              line.adjustedNetAmountMinor ?? line.netAmountMinor ?? 0,
            ),

            vehicleId: line.vehicleId ?? "",

            odometer: Number(line.odometer ?? 0),
          }));
      })
      .sort(
        (firstPurchase, secondPurchase) =>
          getTransactionDateValue(secondPurchase) -
          getTransactionDateValue(firstPurchase),
      ),
);

// =====================================================
// 8.GÜN
// Yakıt türüne göre fiyat analizi
// =====================================================

export const selectFuelPriceAnalysis = createSelector(
  [selectFuelPurchaseHistory],

  (history) => {
    const groupedHistory = history.reduce((result, item) => {
      if (!result[item.fuelType]) {
        result[item.fuelType] = [];
      }

      result[item.fuelType].push(item);

      return result;
    }, {});

    return Object.entries(groupedHistory).map(([fuelType, items]) => {
      const prices = items
        .map((item) => item.unitPriceMinor)
        .filter((value) => value > 0);

      const lastPurchase = items[0];

      const previousPurchase = items[1];

      const previousPriceMinor = previousPurchase?.unitPriceMinor ?? 0;

      const lastPriceMinor = lastPurchase?.unitPriceMinor ?? 0;

      const priceChangePercent =
        previousPriceMinor > 0
          ? Number(
              (
                ((lastPriceMinor - previousPriceMinor) / previousPriceMinor) *
                100
              ).toFixed(2),
            )
          : null;

      return {
        fuelType,

        purchaseCount: items.length,

        minPriceMinor: prices.length > 0 ? Math.min(...prices) : 0,

        maxPriceMinor: prices.length > 0 ? Math.max(...prices) : 0,

        averagePriceMinor:
          prices.length > 0
            ? Math.round(
                prices.reduce((total, value) => total + value, 0) /
                  prices.length,
              )
            : 0,

        lastPriceMinor,

        previousPriceMinor,

        priceChangePercent,

        lastPurchaseDate: lastPurchase?.transactionDate ?? "",
      };
    });
  },
);
