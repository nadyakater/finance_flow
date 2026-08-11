import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  calculateDashboardTotals,
} from "./dashboardCalculations";

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard ve analizler için mevcut transaction
// kayıtlarından finansal özetlerin hesaplanmasını sağlar.
//
// Hesaplanan değerler:
// - TotalIncome
// - TotalExpense
// - TotalRefunds
// - NetCashFlow
// - SavingsRate
// =====================================================

export const calculateDashboard =
  createAsyncThunk(
    "dashboard/calculateDashboard",
    async (transactions) => {
      // =====================================================
      // 12.GÜN - 3.19
      //
      // Transaction kayıtlarından Dashboard için gerekli
      // bütün finansal değerler hesaplanır.
      // =====================================================

      const dashboardTotals =
        calculateDashboardTotals(
          Array.isArray(transactions)
            ? transactions
            : [],
        );

      return dashboardTotals;
    },
  );