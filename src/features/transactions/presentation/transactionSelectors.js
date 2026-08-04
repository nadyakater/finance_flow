import { createSelector } from "@reduxjs/toolkit";

const selectTransactionState = (state) =>
  state.transactions;

// 3.GÜN - Gelir ve gider kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectTransactions = (state) =>
  selectTransactionState(state).items;

// 3.GÜN - Kayıtların yüklenme durumunu alan selector oluşturuldu.
export const selectTransactionLoadStatus =
  (state) =>
    selectTransactionState(
      state,
    ).loadStatus;

// 3.GÜN - Yeni kayıt ekleme durumunu alan selector oluşturuldu.
export const selectTransactionSaveStatus =
  (state) =>
    selectTransactionState(
      state,
    ).saveStatus;

// 3.GÜN - Gelir ve gider işlemlerindeki hata bilgisini alan selector oluşturuldu.
export const selectTransactionError = (state) =>
  selectTransactionState(state).error;

function getRemainingExpenseMinor(
  transaction,
) {
  const amountMinor = Number(
    transaction.amountMinor ?? 0,
  );

  const refundedMinor = Number(
    transaction.refundedMinor ?? 0,
  );

  return Math.max(
    amountMinor - refundedMinor,
    0,
  );
}

function getTransactionDateValue(
  transaction,
) {
  const dateValue =
    transaction.transactionDate ||
    transaction.createdAtUtc;

  const timestamp =
    new Date(dateValue).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function allocateRefundToLines(
  transaction,
) {
  const lines = Array.isArray(
    transaction.lines,
  )
    ? transaction.lines
    : [];

  if (lines.length === 0) {
    return [];
  }

  const transactionAmountMinor =
    Number(
      transaction.amountMinor ?? 0,
    );

  const remainingExpenseMinor =
    getRemainingExpenseMinor(
      transaction,
    );

  if (transactionAmountMinor <= 0) {
    return lines.map((line) => ({
      ...line,
      adjustedNetAmountMinor: 0,
    }));
  }

  if (
    remainingExpenseMinor ===
    transactionAmountMinor
  ) {
    return lines.map((line) => ({
      ...line,
      adjustedNetAmountMinor:
        Number(
          line.netAmountMinor ?? 0,
        ),
    }));
  }

  let allocatedTotalMinor = 0;

  return lines.map(
    (line, index) => {
      const lineNetAmountMinor =
        Number(
          line.netAmountMinor ?? 0,
        );

      const isLastLine =
        index === lines.length - 1;

      const adjustedNetAmountMinor =
        isLastLine
          ? Math.max(
              remainingExpenseMinor -
                allocatedTotalMinor,
              0,
            )
          : Math.round(
              (lineNetAmountMinor *
                remainingExpenseMinor) /
                transactionAmountMinor,
            );

      allocatedTotalMinor +=
        adjustedNetAmountMinor;

      return {
        ...line,
        adjustedNetAmountMinor,
      };
    },
  );
}

// 6.GÜN - Gelir kayıtlarının toplam tutarını hesaplayan selector oluşturuldu.
export const selectTotalIncomeMinor =
  createSelector(
    [selectTransactions],
    (transactions) =>
      transactions
        .filter(
          (transaction) =>
            transaction.transactionType ===
            "Gelir",
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amountMinor ??
                0,
            ),
          0,
        ),
  );

// 6.GÜN - İade uygulanmadan önceki toplam gider tutarını hesaplayan selector oluşturuldu.
export const selectGrossExpenseMinor =
  createSelector(
    [selectTransactions],
    (transactions) =>
      transactions
        .filter(
          (transaction) =>
            transaction.transactionType ===
            "Gider",
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amountMinor ??
                0,
            ),
          0,
        ),
  );

// 6.GÜN - Oluşturulan bütün iade kayıtlarının toplamını hesaplayan selector oluşturuldu.
export const selectTotalRefundMinor =
  createSelector(
    [selectTransactions],
    (transactions) =>
      transactions
        .filter(
          (transaction) =>
            transaction.transactionType ===
            "İade",
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amountMinor ??
                0,
            ),
          0,
        ),
  );

// 6.GÜN - İadeler düşüldükten sonraki gerçek gider toplamını hesaplayan selector oluşturuldu.
export const selectNetExpenseMinor =
  createSelector(
    [selectTransactions],
    (transactions) =>
      transactions
        .filter(
          (transaction) =>
            transaction.transactionType ===
            "Gider",
        )
        .reduce(
          (total, transaction) =>
            total +
            getRemainingExpenseMinor(
              transaction,
            ),
          0,
        ),
  );

// 6.GÜN - Gelir ve iade sonrası gider arasındaki net tutarı hesaplayan selector oluşturuldu.
export const selectNetBalanceMinor =
  createSelector(
    [
      selectTotalIncomeMinor,
      selectNetExpenseMinor,
    ],
    (
      totalIncomeMinor,
      netExpenseMinor,
    ) =>
      totalIncomeMinor -
      netExpenseMinor,
  );

const selectProductId = (
  _state,
  productId,
) => productId;

// 6.GÜN - Seçilen ürünün geçmiş gider satırlarını firma, şube ve fiyat bilgileriyle hazırlayan selector oluşturuldu.
export const selectProductPurchaseHistory =
  createSelector(
    [
      selectTransactions,
      selectProductId,
    ],
    (
      transactions,
      productId,
    ) => {
      if (!productId) {
        return [];
      }

      return transactions
        .filter(
          (transaction) =>
            transaction.transactionType ===
            "Gider",
        )
        .flatMap((transaction) => {
          const adjustedLines =
            allocateRefundToLines(
              transaction,
            );

          return adjustedLines
            .filter(
              (line) =>
                line.productId ===
                productId,
            )
            .map((line) => {
              const normalizedQuantity =
                Number(
                  line.normalizedQuantity ??
                    0,
                );

              const adjustedNetAmountMinor =
                Number(
                  line.adjustedNetAmountMinor ??
                    0,
                );

              const normalizedUnitPriceMinor =
                normalizedQuantity > 0
                  ? Math.round(
                      adjustedNetAmountMinor /
                        normalizedQuantity,
                    )
                  : 0;

              return {
                transactionId:
                  transaction.id,

                transactionDate:
                  transaction.transactionDate ||
                  transaction.createdAtUtc,

                merchantId:
                  transaction.merchantId ??
                  "",

                merchantName:
                  transaction.merchantName ??
                  "",

                branchId:
                  transaction.branchId ??
                  "",

                branchName:
                  transaction.branchName ??
                  "",

                productId:
                  line.productId ?? "",

                productName:
                  line.productName ?? "",

                brandId:
                  line.brandId ?? "",

                brandName:
                  line.brandName ?? "",

                purchaseQuantity:
                  Number(
                    line.purchaseQuantity ??
                      0,
                  ),

                unitCount:
                  Number(
                    line.unitCount ?? 0,
                  ),

                unitSize:
                  Number(
                    line.unitSize ?? 0,
                  ),

                unitType:
                  line.unitType ?? "",

                normalizedQuantity,

                normalizedUnit:
                  line.normalizedUnit ??
                  "",

                netAmountMinor:
                  adjustedNetAmountMinor,

                normalizedUnitPriceMinor,
              };
            });
        })
        .sort(
          (
            firstPurchase,
            secondPurchase,
          ) =>
            getTransactionDateValue(
              secondPurchase,
            ) -
            getTransactionDateValue(
              firstPurchase,
            ),
        );
    },
  );

function calculateMedian(values) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [
    ...values,
  ].sort(
    (
      firstValue,
      secondValue,
    ) =>
      firstValue -
      secondValue,
  );

  const middleIndex = Math.floor(
    sortedValues.length / 2,
  );

  if (
    sortedValues.length % 2 === 1
  ) {
    return sortedValues[
      middleIndex
    ];
  }

  return Math.round(
    (sortedValues[
      middleIndex - 1
    ] +
      sortedValues[
        middleIndex
      ]) /
      2,
  );
}

// 6.GÜN - Seçilen ürünün normalize birimlerine göre minimum, maksimum, ortalama, medyan ve son fiyatını hesaplayan selector oluşturuldu.
export const selectProductPriceAnalysis =
  createSelector(
    [selectProductPurchaseHistory],
    (purchaseHistory) => {
      const purchasesByUnit =
        purchaseHistory.reduce(
          (
            groupedPurchases,
            purchase,
          ) => {
            const normalizedUnit =
              purchase.normalizedUnit;

            if (
              !normalizedUnit ||
              purchase.normalizedUnitPriceMinor <=
                0
            ) {
              return groupedPurchases;
            }

            if (
              !groupedPurchases[
                normalizedUnit
              ]
            ) {
              groupedPurchases[
                normalizedUnit
              ] = [];
            }

            groupedPurchases[
              normalizedUnit
            ].push(purchase);

            return groupedPurchases;
          },
          {},
        );

      return Object.entries(
        purchasesByUnit,
      ).map(
        ([
          normalizedUnit,
          purchases,
        ]) => {
          const prices =
            purchases.map(
              (purchase) =>
                purchase.normalizedUnitPriceMinor,
            );

          const totalPriceMinor =
            prices.reduce(
              (
                total,
                priceMinor,
              ) =>
                total +
                priceMinor,
              0,
            );

          const lastPurchase =
            purchases[0];

          const previousPurchase =
            purchases[1];

          const previousPriceMinor =
            previousPurchase
              ?.normalizedUnitPriceMinor ??
            0;

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

            purchaseCount:
              purchases.length,

            minPriceMinor:
              Math.min(...prices),

            maxPriceMinor:
              Math.max(...prices),

            averagePriceMinor:
              Math.round(
                totalPriceMinor /
                  prices.length,
              ),

            medianPriceMinor:
              calculateMedian(
                prices,
              ),

            lastPriceMinor:
              lastPurchase.normalizedUnitPriceMinor,

            previousPriceMinor,

            priceChangePercent,

            lastPurchaseDate:
              lastPurchase.transactionDate,
          };
        },
      );
    },
  );