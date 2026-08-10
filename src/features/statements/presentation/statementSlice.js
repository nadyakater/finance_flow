import {
  createSlice,
} from "@reduxjs/toolkit";

import {
  changeStatementDueDate,
  loadStatementPeriods,
  payStatement,
} from "../application/statementThunks";

const initialState = {
  items: [],

  loadStatus:
    "idle",

  mutationStatus:
    "idle",

  error: null,
};

// =====================================================
// 11.GÜN
// Kredi kartı ekstre dönemlerinin ortak Redux state
// içerisinde tutulması için statement slice oluşturuldu.
// =====================================================

const statementSlice =
  createSlice({
    name: "statements",

    initialState,

    reducers: {
      clearStatementError(
        state,
      ) {
        state.error = null;
      },
    },

    extraReducers:
      (builder) => {
        builder
          .addCase(
            loadStatementPeriods.pending,
            (state) => {
              state.loadStatus =
                "loading";

              state.error =
                null;
            },
          )

          .addCase(
            loadStatementPeriods.fulfilled,
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
            loadStatementPeriods.rejected,
            (
              state,
              action,
            ) => {
              state.loadStatus =
                "failed";

              state.error =
                action.payload;
            },
          )

          .addCase(
            payStatement.pending,
            (state) => {
              state.mutationStatus =
                "loading";

              state.error =
                null;
            },
          )

          .addCase(
            payStatement.fulfilled,
            (
              state,
              action,
            ) => {
              state.mutationStatus =
                "succeeded";

              const index =
                state.items.findIndex(
                  (
                    statement,
                  ) =>
                    statement.id ===
                    action.payload.id,
                );

              if (
                index !== -1
              ) {
                state.items[index] =
                  action.payload;
              }
            },
          )

          .addCase(
            payStatement.rejected,
            (
              state,
              action,
            ) => {
              state.mutationStatus =
                "failed";

              state.error =
                action.payload;
            },
          )

          .addCase(
            changeStatementDueDate.pending,
            (state) => {
              state.mutationStatus =
                "loading";

              state.error =
                null;
            },
          )

          .addCase(
            changeStatementDueDate.fulfilled,
            (
              state,
              action,
            ) => {
              state.mutationStatus =
                "succeeded";

              const index =
                state.items.findIndex(
                  (
                    statement,
                  ) =>
                    statement.id ===
                    action.payload.id,
                );

              if (
                index !== -1
              ) {
                state.items[index] =
                  action.payload;
              }
            },
          )

          .addCase(
            changeStatementDueDate.rejected,
            (
              state,
              action,
            ) => {
              state.mutationStatus =
                "failed";

              state.error =
                action.payload;
            },
          );
      },
  });

export const {
  clearStatementError,
} = statementSlice.actions;

export default statementSlice.reducer;