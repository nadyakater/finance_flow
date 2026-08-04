import { createSlice } from "@reduxjs/toolkit";

import {
  addRefundTransaction,
  addTransaction,
  loadTransactions,
} from "../application/transactionThunks";

const initialState = {
  items: [],
  loadStatus: "idle",
  saveStatus: "idle",
  error: null,
};

const transactionSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(
        loadTransactions.pending,
        (state) => {
          state.loadStatus = "loading";
          state.error = null;
        },
      )
      .addCase(
        loadTransactions.fulfilled,
        (state, action) => {
          state.items = action.payload;
          state.loadStatus =
            "succeeded";
          state.error = null;
        },
      )
      .addCase(
        loadTransactions.rejected,
        (state, action) => {
          state.loadStatus = "failed";

          state.error =
            action.payload ??
            "Kayıtlar getirilemedi.";
        },
      )
      .addCase(
        addTransaction.pending,
        (state) => {
          state.saveStatus = "loading";
          state.error = null;
        },
      )
      .addCase(
        addTransaction.fulfilled,
        (state, action) => {
          state.items.unshift(
            action.payload,
          );

          state.saveStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        addTransaction.rejected,
        (state, action) => {
          state.saveStatus = "failed";

          state.error =
            action.payload ??
            "Kayıt eklenemedi.";
        },
      )
      // 6.GÜN - Tam veya kısmi iade kaydının Redux listesine eklenmesi sağlandı.
      .addCase(
        addRefundTransaction.pending,
        (state) => {
          state.saveStatus = "loading";
          state.error = null;
        },
      )
      .addCase(
        addRefundTransaction.fulfilled,
        (state, action) => {
          const refundTransaction =
            action.payload;

          state.items.unshift(
            refundTransaction,
          );

          const originalTransaction =
            state.items.find(
              (transaction) =>
                transaction.id ===
                refundTransaction.originalTransactionId,
            );

          if (originalTransaction) {
            const currentRefundedMinor =
              Number(
                originalTransaction.refundedMinor ??
                  0,
              );

            const newRefundedMinor =
              currentRefundedMinor +
              Number(
                refundTransaction.amountMinor ??
                  0,
              );

            originalTransaction.refundedMinor =
              newRefundedMinor;

            originalTransaction.refundStatus =
              newRefundedMinor >=
              Number(
                originalTransaction.amountMinor ??
                  0,
              )
                ? "full"
                : "partial";
          }

          state.saveStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        addRefundTransaction.rejected,
        (state, action) => {
          state.saveStatus = "failed";

          state.error =
            action.payload ??
            "İade kaydı oluşturulamadı.";
        },
      );
  },
});

// 3.GÜN - Gelir ve gider kayıtlarının Redux state yapısı oluşturuldu.
// 6.GÜN - İade kayıtları ve orijinal giderin iade durumu Redux state içerisinde yönetildi.
export default transactionSlice.reducer;