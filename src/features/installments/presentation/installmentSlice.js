import {
  createSlice,
} from "@reduxjs/toolkit";

import {
  loadInstallmentPlans,
} from "../application/installmentThunks";

const initialState = {
  items: [],

  loadStatus:
    "idle",

  error: null,
};

// =====================================================
// 11.GÜN
// Kredi kartı taksit planlarının ortak Redux state
// içerisinde tutulması için installment slice oluşturuldu.
// =====================================================

const installmentSlice =
  createSlice({
    name: "installments",

    initialState,

    reducers: {
      clearInstallmentError(
        state,
      ) {
        state.error = null;
      },
    },

    extraReducers:
      (builder) => {
        builder
          .addCase(
            loadInstallmentPlans.pending,
            (state) => {
              state.loadStatus =
                "loading";

              state.error =
                null;
            },
          )

          .addCase(
            loadInstallmentPlans.fulfilled,
            (
              state,
              action,
            ) => {
              state.loadStatus =
                "succeeded";

              state.items =
                action.payload;
            },
          )

          .addCase(
            loadInstallmentPlans.rejected,
            (
              state,
              action,
            ) => {
              state.loadStatus =
                "failed";

              state.error =
                action.payload;
            },
          );
      },
  });

export const {
  clearInstallmentError,
} = installmentSlice.actions;

export default installmentSlice.reducer;