import {
  createSelector,
} from "@reduxjs/toolkit";

const selectCreditCardState =
  (state) =>
    state.creditCards;

const selectTransactionItems =
  (state) =>
    state.transactions.items;

// 9.GÜN - Kredi kartı kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectCreditCards =
  (state) =>
    selectCreditCardState(
      state,
    ).creditCards;

// =====================================================
// 11.GÜN
// Aktif kredi kartları createSelector ile hesaplanarak
// gereksiz yeniden render oluşması engellendi.
// =====================================================

export const selectActiveCreditCards =
  createSelector(
    [
      selectCreditCards,
    ],
    (
      creditCards,
    ) =>
      creditCards.filter(
        (
          creditCard,
        ) =>
          creditCard.isActive,
      ),
  );

// 9.GÜN - Kredi kartlarının yüklenme durumunu alan selector oluşturuldu.
export const selectCreditCardLoadStatus =
  (state) =>
    selectCreditCardState(
      state,
    ).loadStatus;

// 9.GÜN - Kredi kartı ekleme ve güncelleme durumunu alan selector oluşturuldu.
export const selectCreditCardMutationStatus =
  (state) =>
    selectCreditCardState(
      state,
    ).mutationStatus;

// 9.GÜN - Kredi kartı işlemlerindeki hata bilgisini alan selector oluşturuldu.
export const selectCreditCardError =
  (state) =>
    selectCreditCardState(
      state,
    ).error;

// 10.GÜN - Kart limiti ile karta ait iade sonrası harcamalar arasındaki farktan kalan limit hesaplandı.
export const selectCreditCardsWithRemainingLimit =
  createSelector(
    [
      selectCreditCards,
      selectTransactionItems,
    ],
    (
      creditCards,
      transactions,
    ) =>
      creditCards.map(
        (
          creditCard,
        ) => {
          const usedLimitMinor =
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
                    creditCard.id,
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

          return {
            ...creditCard,

            usedLimitMinor,

            remainingLimitMinor:
              Math.max(
                Number(
                  creditCard.limitMinor ??
                    0,
                ) -
                  usedLimitMinor,
                0,
              ),
          };
        },
      ),
  );