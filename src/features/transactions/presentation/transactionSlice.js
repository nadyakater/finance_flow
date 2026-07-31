import { createSlice } from "@reduxjs/toolkit";

import {
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
          state.loadStatus = "succeeded";
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

          state.saveStatus = "succeeded";
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
      );
  },
});

// 3.GÜN - Gelir ve gider kayıtlarının Redux state yapısı oluşturuldu.
export default transactionSlice.reducer;