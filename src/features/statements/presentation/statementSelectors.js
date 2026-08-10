import {
  createSelector,
} from "@reduxjs/toolkit";

const selectStatementState =
  (state) =>
    state.statements;

const selectTransactionItems =
  (state) =>
    state.transactions.items;

const selectInstallmentItems =
  (state) =>
    state.installments.items;

// 11.GÜN - Bütün ekstre dönemlerini Redux içerisinden alan selector oluşturuldu.
export const selectStatementPeriods =
  (state) =>
    selectStatementState(
      state,
    ).items;

// 11.GÜN - Ekstre yükleme durumunu alan selector oluşturuldu.
export const selectStatementLoadStatus =
  (state) =>
    selectStatementState(
      state,
    ).loadStatus;

// 11.GÜN - Ekstre ödeme ve tarih güncelleme durumunu alan selector oluşturuldu.
export const selectStatementMutationStatus =
  (state) =>
    selectStatementState(
      state,
    ).mutationStatus;

// 11.GÜN - Ekstre işlemlerinde oluşan hata bilgisini alan selector oluşturuldu.
export const selectStatementError =
  (state) =>
    selectStatementState(
      state,
    ).error;

// =====================================================
// 11.GÜN
// Ekstre dönemleri kredi kartı kimliğine göre gruplanarak
// kredi kartı ekranında kolayca kullanılabilir hale getirildi.
// =====================================================

export const selectStatementPeriodsByCreditCard =
  createSelector(
    [
      selectStatementPeriods,
    ],
    (
      statementPeriods,
    ) =>
      statementPeriods.reduce(
        (
          groupedStatements,
          statement,
        ) => {
          if (
            !statement.creditCardId
          ) {
            return groupedStatements;
          }

          if (
            !groupedStatements[
              statement.creditCardId
            ]
          ) {
            groupedStatements[
              statement.creditCardId
            ] = [];
          }

          groupedStatements[
            statement.creditCardId
          ].push(
            statement,
          );

          return groupedStatements;
        },
        {},
      ),
  );

// =====================================================
// 11.GÜN
// Ödenmemiş bütün ekstre tutarlarının toplamı hesaplanarak
// kartların gerçek mevcut borç yükü elde edilir.
// =====================================================

export const selectTotalUnpaidStatementMinor =
  createSelector(
    [
      selectStatementPeriods,
    ],
    (
      statementPeriods,
    ) =>
      statementPeriods.reduce(
        (
          total,
          statement,
        ) =>
          total +
          Number(
            statement.unpaidAmountMinor ??
              0,
          ),
        0,
      ),
  );

function getTodayDateValue() {
  const today =
    new Date();

  const timezoneOffset =
    today.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    today.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .slice(
      0,
      10,
    );
}

function findCurrentStatement(
  statements,
  todayValue,
) {
  if (
    !Array.isArray(
      statements,
    ) ||
    statements.length === 0
  ) {
    return null;
  }

  const currentStatement =
    statements.find(
      (
        statement,
      ) =>
        statement.cycleStart &&
        statement.cycleEnd &&
        todayValue >=
          statement.cycleStart &&
        todayValue <=
          statement.cycleEnd,
    );

  if (
    currentStatement
  ) {
    return currentStatement;
  }

  const projectedStatement =
    statements.find(
      (
        statement,
      ) =>
        statement.status ===
        "projected",
    );

  return (
    projectedStatement ??
    statements[0]
  );
}

// =====================================================
// 11.GÜN
// Satın alma tutarı ile kredi kartının ödeme yükü birbirinden
// ayrılarak PDF 3.14 için kart bazlı analiz oluşturuldu.
//
// Yeni harcama satın alma tarihine göre tam tutarı gösterirken
// ekstre yükü yalnız ilgili dönemde ödenecek tutarı gösterir.
// =====================================================

export const selectCreditCardPurchaseLoadSummaries =
  createSelector(
    [
      selectStatementPeriodsByCreditCard,
      selectTransactionItems,
      selectInstallmentItems,
    ],
    (
      statementsByCreditCard,
      transactions,
      installmentPlans,
    ) => {
      const summaries =
        {};

      const todayValue =
        getTodayDateValue();

      const creditCardIds =
        new Set([
          ...Object.keys(
            statementsByCreditCard,
          ),

          ...transactions
            .filter(
              (
                transaction,
              ) =>
                transaction.creditCardId,
            )
            .map(
              (
                transaction,
              ) =>
                transaction.creditCardId,
            ),

          ...installmentPlans
            .filter(
              (
                installmentPlan,
              ) =>
                installmentPlan.creditCardId,
            )
            .map(
              (
                installmentPlan,
              ) =>
                installmentPlan.creditCardId,
            ),
        ]);

      creditCardIds.forEach(
        (
          creditCardId,
        ) => {
          const cardStatements =
            statementsByCreditCard[
              creditCardId
            ] ?? [];

          const currentStatement =
            findCurrentStatement(
              cardStatements,
              todayValue,
            );

          if (
            !currentStatement
          ) {
            summaries[
              creditCardId
            ] = {
              cycleStart:
                "",

              cycleEnd:
                "",

              dueDate:
                "",

              newSpendingMinor:
                0,

              priorCommitmentBurdenMinor:
                0,

              cashNeededByDueDateMinor:
                0,

              futureCommittedInstallmentsMinor:
                0,
            };

            return;
          }

          // =====================================================
          // 11.GÜN
          // Bu ekstre döneminde yapılan yeni satın almaların tam
          // tutarı hesaplanır, taksitli alışveriş de tam tutarla sayılır.
          // =====================================================

          const newSpendingMinor =
            transactions
              .filter(
                (
                  transaction,
                ) =>
                  transaction.transactionType ===
                    "Gider" &&
                  transaction.paymentMethod ===
                    "Kredi Kartı" &&
                  transaction.creditCardId ===
                    creditCardId &&
                  transaction.transactionDate >=
                    currentStatement.cycleStart &&
                  transaction.transactionDate <=
                    currentStatement.cycleEnd,
              )
              .reduce(
                (
                  total,
                  transaction,
                ) => {
                  const amountMinor =
                    Number(
                      transaction.amountMinor ??
                        0,
                    );

                  const refundedMinor =
                    Number(
                      transaction.refundedMinor ??
                        0,
                    );

                  return (
                    total +
                    Math.max(
                      amountMinor -
                        refundedMinor,
                      0,
                    )
                  );
                },
                0,
              );

          // =====================================================
          // 11.GÜN
          // Önceki dönemlerde yapılan alışverişlerden bu ekstreye
          // düşen taksitler prior commitment burden olarak hesaplanır.
          // =====================================================

          const priorCommitmentBurdenMinor =
            installmentPlans
              .filter(
                (
                  installmentPlan,
                ) =>
                  installmentPlan.creditCardId ===
                  creditCardId &&
                  installmentPlan.transactionDate <
                    currentStatement.cycleStart,
              )
              .reduce(
                (
                  planTotal,
                  installmentPlan,
                ) => {
                  const installments =
                    Array.isArray(
                      installmentPlan.installments,
                    )
                      ? installmentPlan.installments
                      : [];

                  const currentCycleInstallments =
                    installments.reduce(
                      (
                        installmentTotal,
                        installment,
                      ) => {
                        if (
                          installment.status ===
                          "paid"
                        ) {
                          return installmentTotal;
                        }

                        if (
                          installment.statementDate !==
                          currentStatement.cycleEnd
                        ) {
                          return installmentTotal;
                        }

                        return (
                          installmentTotal +
                          Number(
                            installment.amountMinor ??
                              0,
                          )
                        );
                      },
                      0,
                    );

                  return (
                    planTotal +
                    currentCycleInstallments
                  );
                },
                0,
              );

          // =====================================================
          // 11.GÜN
          // Son ödeme tarihine kadar bulunması gereken net para,
          // ekstre toplamından daha önce yapılan ödemeler düşülerek alınır.
          // =====================================================

          const cashNeededByDueDateMinor =
            Math.max(
              Number(
                currentStatement.statementAmountMinor ??
                  0,
              ) -
                Number(
                  currentStatement.paidAmountMinor ??
                    0,
                ),
              0,
            );

          // =====================================================
          // 11.GÜN
          // Mevcut ekstre sonrasındaki aylara kalan ödenmemiş
          // taksitler gelecekteki taahhüt edilmiş borç olarak hesaplanır.
          // =====================================================

          const futureCommittedInstallmentsMinor =
            installmentPlans
              .filter(
                (
                  installmentPlan,
                ) =>
                  installmentPlan.creditCardId ===
                  creditCardId,
              )
              .reduce(
                (
                  planTotal,
                  installmentPlan,
                ) => {
                  const installments =
                    Array.isArray(
                      installmentPlan.installments,
                    )
                      ? installmentPlan.installments
                      : [];

                  const futurePlanTotal =
                    installments.reduce(
                      (
                        installmentTotal,
                        installment,
                      ) => {
                        if (
                          installment.status ===
                          "paid"
                        ) {
                          return installmentTotal;
                        }

                        if (
                          !installment.statementDate ||
                          installment.statementDate <=
                            currentStatement.cycleEnd
                        ) {
                          return installmentTotal;
                        }

                        return (
                          installmentTotal +
                          Number(
                            installment.amountMinor ??
                              0,
                          )
                        );
                      },
                      0,
                    );

                  return (
                    planTotal +
                    futurePlanTotal
                  );
                },
                0,
              );

          summaries[
            creditCardId
          ] = {
            cycleStart:
              currentStatement.cycleStart,

            cycleEnd:
              currentStatement.cycleEnd,

            dueDate:
              currentStatement.dueDate,

            newSpendingMinor,

            priorCommitmentBurdenMinor,

            cashNeededByDueDateMinor,

            futureCommittedInstallmentsMinor,
          };
        },
      );

      return summaries;
    },
  );