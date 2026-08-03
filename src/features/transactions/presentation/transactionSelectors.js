const selectTransactionState = (
  state,
) => state.transactions;

// 3.GÜN - Gelir ve gider kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectTransactions = (
  state,
) =>
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
export const selectTransactionError = (
  state,
) =>
  selectTransactionState(state).error;