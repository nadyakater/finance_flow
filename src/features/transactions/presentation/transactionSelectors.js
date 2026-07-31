// 3.GÜN - Gelir ve gider kayıtlarını Redux içinden alan selector yapısı oluşturuldu.

export const selectTransactions = (
  state,
) => state.transactions.items;

export const selectTransactionLoadStatus = (
  state,
) => state.transactions.loadStatus;

export const selectTransactionSaveStatus = (
  state,
) => state.transactions.saveStatus;

export const selectTransactionError = (
  state,
) => state.transactions.error;