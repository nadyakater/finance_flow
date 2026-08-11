import { createSlice } from "@reduxjs/toolkit";

import { calculateDashboard } from "./dashboardThunks";

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard ve analizler için Redux state yapısı.
//
// Dashboard içerisinde:
// - TotalIncome
// - TotalExpense
// - TotalRefunds
// - NetCashFlow
// - SavingsRate
//
// değerleri tutulur.
// =====================================================

const initialState = {
  totalIncome: 0,

  totalExpense: 0,

  totalRefunds: 0,

  netCashFlow: 0,

  savingsRate: 0,

  status: "idle",

  error: null,
};

const dashboardSlice =
  createSlice({
    name: "dashboard",

    initialState,

    reducers: {
      // =====================================================
      // 12.GÜN - 3.19
      //
      // Dashboard hata bilgisini temizler.
      // =====================================================

      clearDashboardError: (
        state,
      ) => {
        state.error = null;
      },
    },

    extraReducers: (
      builder,
    ) => {
      // =====================================================
      // 12.GÜN - 3.19
      //
      // Dashboard hesaplaması başlatıldığında yüklenme
      // durumu aktif hale getirilir.
      // =====================================================

      builder.addCase(
        calculateDashboard.pending,
        (state) => {
          state.status =
            "loading";

          state.error = null;
        },
      );

      // =====================================================
      // 12.GÜN - 3.19
      //
      // Dashboard hesaplaması başarılı olduğunda
      // hesaplanan finansal değerler Redux state'e aktarılır.
      // =====================================================

      builder.addCase(
        calculateDashboard.fulfilled,
        (
          state,
          action,
        ) => {
          state.status =
            "succeeded";

          state.totalIncome =
            action.payload.totalIncome;

          state.totalExpense =
            action.payload.totalExpense;

          state.totalRefunds =
            action.payload.totalRefunds;

          state.netCashFlow =
            action.payload.netCashFlow;

          state.savingsRate =
            action.payload.savingsRate;

          state.error = null;
        },
      );

      // =====================================================
      // 12.GÜN - 3.19
      //
      // Dashboard hesaplaması başarısız olduğunda
      // hata bilgisi Redux state içerisinde tutulur.
      // =====================================================

      builder.addCase(
        calculateDashboard.rejected,
        (
          state,
          action,
        ) => {
          state.status =
            "failed";

          state.error =
            action.error?.message ||
            "Dashboard hesaplanırken bir hata oluştu.";
        },
      );
    },
  });

export const {
  clearDashboardError,
} =
  dashboardSlice.actions;

export default dashboardSlice.reducer;