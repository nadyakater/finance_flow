import { createSlice } from "@reduxjs/toolkit";

import {
  addRefundTransaction,
  addTransaction,
  loadTransactions,
  removeTransaction,
} from "../application/transactionThunks";

const initialState = {
  items: [],

  loadStatus: "idle",

  saveStatus: "idle",

  refundStatus: "idle",

  deleteStatus: "idle",

  error: null,

  successMessage: "",
};

const transactionSlice = createSlice({
  name: "transactions",

  initialState,

  reducers: {
    clearTransactionError(state) {
      state.error = null;
    },

    clearTransactionMessage(state) {
      state.successMessage = "";
    },

    resetTransactions(state) {
      state.items = [];

      state.loadStatus = "idle";

      state.saveStatus = "idle";

      state.refundStatus = "idle";

      state.deleteStatus = "idle";

      state.error = null;

      state.successMessage = "";
    },
  },

  extraReducers: (builder) => {
    builder

      // =====================================================
      // Kayıtları getirme
      // =====================================================
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

          state.loadStatus = "succeeded";

          state.error = null;
        },
      )

      .addCase(
        loadTransactions.rejected,

        (state, action) => {
          state.loadStatus = "failed";

          state.error = action.payload ?? "Kayıtlar getirilemedi.";
        },
      )

      // =====================================================
      // Gelir veya gider ekleme
      // =====================================================
      .addCase(
        addTransaction.pending,

        (state) => {
          state.saveStatus = "loading";

          state.error = null;

          state.successMessage = "";
        },
      )

      .addCase(
        addTransaction.fulfilled,

        (state, action) => {
          state.items.unshift(action.payload);

          state.saveStatus = "succeeded";

          state.error = null;

          state.successMessage =
            action.payload.transactionType === "Gelir"
              ? "Gelir kaydı başarıyla eklendi."
              : "Gider kaydı başarıyla eklendi.";
        },
      )

      .addCase(
        addTransaction.rejected,

        (state, action) => {
          state.saveStatus = "failed";

          state.error = action.payload ?? "Kayıt eklenemedi.";
        },
      )

      // =====================================================
      // İade oluşturma
      // =====================================================
      .addCase(
        addRefundTransaction.pending,

        (state) => {
          state.refundStatus = "loading";

          state.error = null;

          state.successMessage = "";
        },
      )

      .addCase(
        addRefundTransaction.fulfilled,

        (state, action) => {
          const refundTransaction = action.payload;

          state.items.unshift(refundTransaction);

          const originalTransaction = state.items.find(
            (transaction) =>
              transaction.id === refundTransaction.originalTransactionId,
          );

          if (originalTransaction) {
            const currentRefundedMinor = Number(
              originalTransaction.refundedMinor ?? 0,
            );

            const newRefundedMinor =
              currentRefundedMinor + Number(refundTransaction.amountMinor ?? 0);

            originalTransaction.refundedMinor = newRefundedMinor;

            originalTransaction.refundStatus =
              newRefundedMinor >= Number(originalTransaction.amountMinor ?? 0)
                ? "full"
                : "partial";

            const refundedLines = Array.isArray(refundTransaction.refundedLines)
              ? refundTransaction.refundedLines
              : [];

            if (refundedLines.length > 0) {
              originalTransaction.lines = originalTransaction.lines.map(
                (originalLine) => {
                  const relatedRefundLine = refundedLines.find(
                    (refundLine) => refundLine.lineId === originalLine.id,
                  );

                  if (!relatedRefundLine) {
                    return originalLine;
                  }

                  const newLineRefundedMinor =
                    Number(originalLine.refundedMinor ?? 0) +
                    Number(relatedRefundLine.amountMinor ?? 0);

                  return {
                    ...originalLine,

                    refundedMinor: newLineRefundedMinor,

                    refundStatus:
                      newLineRefundedMinor >=
                      Number(originalLine.netAmountMinor ?? 0)
                        ? "full"
                        : "partial",
                  };
                },
              );
            }
          }

          state.refundStatus = "succeeded";

          state.error = null;

          state.successMessage = "İade kaydı başarıyla oluşturuldu.";
        },
      )

      .addCase(
        addRefundTransaction.rejected,

        (state, action) => {
          state.refundStatus = "failed";

          state.error = action.payload ?? "İade kaydı oluşturulamadı.";
        },
      )

      // =====================================================
      // İşlem arşivleme
      // =====================================================
      .addCase(
        removeTransaction.pending,

        (state) => {
          state.deleteStatus = "loading";

          state.error = null;

          state.successMessage = "";
        },
      )

      .addCase(
        removeTransaction.fulfilled,

        (state, action) => {
          state.items = state.items.filter(
            (transaction) => transaction.id !== action.payload,
          );

          state.deleteStatus = "succeeded";

          state.error = null;

          state.successMessage = "Kayıt arşivlendi.";
        },
      )

      .addCase(
        removeTransaction.rejected,

        (state, action) => {
          state.deleteStatus = "failed";

          state.error = action.payload ?? "Kayıt arşivlenemedi.";
        },
      );
  },
});

export const {
  clearTransactionError,

  clearTransactionMessage,

  resetTransactions,
} = transactionSlice.actions;

export default transactionSlice.reducer;
