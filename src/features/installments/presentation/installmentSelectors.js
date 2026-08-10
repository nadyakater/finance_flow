import {
  createSelector,
} from "@reduxjs/toolkit";

const selectInstallmentState =
  (state) =>
    state.installments;

// 11.GÜN - Kredi kartı taksit planlarını Redux içerisinden alan selector oluşturuldu.
export const selectInstallmentPlans =
  (state) =>
    selectInstallmentState(
      state,
    ).items;

// 11.GÜN - Taksit planlarının yüklenme durumunu Redux içerisinden alan selector oluşturuldu.
export const selectInstallmentLoadStatus =
  (state) =>
    selectInstallmentState(
      state,
    ).loadStatus;

// 11.GÜN - Taksit işlemlerinde oluşan hata bilgisini Redux içerisinden alan selector oluşturuldu.
export const selectInstallmentError =
  (state) =>
    selectInstallmentState(
      state,
    ).error;

// =====================================================
// 11.GÜN
// Taksit tarihi kullanıcıya ay ve yıl olarak daha anlaşılır
// şekilde göstermek için Türkçe tarih etiketi oluşturulur.
// =====================================================

function createMonthLabel(
  statementDate,
) {
  if (!statementDate) {
    return "";
  }

  const [
    year,
    month,
  ] = statementDate
    .split("-")
    .map(Number);

  if (
    !year ||
    !month
  ) {
    return statementDate;
  }

  return new Date(
    year,
    month - 1,
    1,
  ).toLocaleDateString(
    "tr-TR",
    {
      month: "long",

      year: "numeric",
    },
  );
}

// =====================================================
// 11.GÜN
// Kredi kartlarının bu ay ödenecek ve gelecek aylara kalan
// taksitleri kart bazında gruplanarak özetlenir.
// =====================================================

export const selectCreditCardInstallmentSummaries =
  createSelector(
    [
      selectInstallmentPlans,
    ],
    (
      installmentPlans,
    ) => {
      const summaries = {};

      const today =
        new Date();

      const currentMonthKey =
        `${today.getFullYear()}-${String(
          today.getMonth() + 1,
        ).padStart(
          2,
          "0",
        )}`;

      installmentPlans.forEach(
        (
          installmentPlan,
        ) => {
          const creditCardId =
            installmentPlan.creditCardId;

          if (!creditCardId) {
            return;
          }

          if (
            !summaries[
              creditCardId
            ]
          ) {
            summaries[
              creditCardId
            ] = {
              currentMonthTotalMinor:
                0,

              futureTotalMinor:
                0,

              futureMonths:
                [],
            };
          }

          const installments =
            Array.isArray(
              installmentPlan.installments,
            )
              ? installmentPlan.installments
              : [];

          installments.forEach(
            (
              installment,
            ) => {
              if (
                installment.status ===
                "paid"
              ) {
                return;
              }

              const statementDate =
                installment.statementDate ??
                "";

              if (!statementDate) {
                return;
              }

              const monthKey =
                statementDate.slice(
                  0,
                  7,
                );

              const amountMinor =
                Number(
                  installment.amountMinor ??
                    0,
                );

              if (
                monthKey ===
                currentMonthKey
              ) {
                summaries[
                  creditCardId
                ].currentMonthTotalMinor +=
                  amountMinor;

                return;
              }

              if (
                monthKey >
                currentMonthKey
              ) {
                summaries[
                  creditCardId
                ].futureTotalMinor +=
                  amountMinor;

                const existingMonth =
                  summaries[
                    creditCardId
                  ].futureMonths.find(
                    (
                      month,
                    ) =>
                      month.monthKey ===
                      monthKey,
                  );

                if (
                  existingMonth
                ) {
                  existingMonth.amountMinor +=
                    amountMinor;
                } else {
                  summaries[
                    creditCardId
                  ].futureMonths.push(
                    {
                      monthKey,

                      monthLabel:
                        createMonthLabel(
                          statementDate,
                        ),

                      amountMinor,
                    },
                  );
                }
              }
            },
          );
        },
      );

      Object.values(
        summaries,
      ).forEach(
        (
          summary,
        ) => {
          summary.futureMonths.sort(
            (
              firstMonth,
              secondMonth,
            ) =>
              firstMonth.monthKey.localeCompare(
                secondMonth.monthKey,
              ),
          );
        },
      );

      return summaries;
    },
  );

// =====================================================
// 11.GÜN
// Henüz ödenmemiş mevcut ve gelecek taksitlerin tamamı
// toplanarak toplam kredi kartı taksit borcu hesaplanır.
// =====================================================

export const selectTotalInstallmentDebtMinor =
  createSelector(
    [
      selectInstallmentPlans,
    ],
    (
      installmentPlans,
    ) =>
      installmentPlans.reduce(
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

          const remainingPlanTotal =
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
            remainingPlanTotal
          );
        },
        0,
      ),
  );