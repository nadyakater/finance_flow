const selectCreditCardState =
  (state) =>
    state.creditCards;

// 9.GÜN - Kredi kartı kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectCreditCards =
  (state) =>
    selectCreditCardState(
      state,
    ).creditCards;

// 9.GÜN - Yalnızca aktif kredi kartlarını getiren selector oluşturuldu.
export const selectActiveCreditCards =
  (state) =>
    selectCreditCards(
      state,
    ).filter(
      (creditCard) =>
        creditCard.isActive,
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