import { createSlice } from "@reduxjs/toolkit";

import { calculateDashboard } from "../application/dashboardThunks";

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

  // 12.GÜN - 3.20 - Dashboard grafiklerinde kullanılacak filtreler Redux state içerisinde tutulur.
  filters: {
    startDate: "",

    endDate: "",

    useActiveReportingPeriod: true,

    creditCardId: "",

    categoryId: "",

    merchantId: "",

    branchId: "",

    brandId: "",

    productId: "",

    paymentMethod: "",
  },

  // 12.GÜN - 3.20 - Grafikte seçilen bölümün işlem listesinde gösterilebilmesi için seçim bilgisi tutulur.
  selectedChartTransactionType: "",
};

const dashboardSlice = createSlice({
  name: "dashboard",

  initialState,

  reducers: {
    // =====================================================
    // 12.GÜN - 3.19
    //
    // Dashboard hata bilgisini temizler.
    // =====================================================

    clearDashboardError: (state) => {
      state.error = null;
    },

    // 12.GÜN - 3.20 - Kullanıcının değiştirdiği tek bir Dashboard filtresi Redux state içerisinde güncellenir.
    setDashboardFilter: (state, action) => {
      const { name, value } = action.payload;

      if (
        Object.prototype.hasOwnProperty.call(
          state.filters,
          name,
        )
      ) {
        state.filters[name] = value;
      }
    },

    // 12.GÜN - 3.20 - Dashboard üzerindeki bütün filtreler başlangıç değerlerine döndürülür.
    clearDashboardFilters: (state) => {
      state.filters = {
        startDate: "",

        endDate: "",

        useActiveReportingPeriod: true,

        creditCardId: "",

        categoryId: "",

        merchantId: "",

        branchId: "",

        brandId: "",

        productId: "",

        paymentMethod: "",
      };

      state.selectedChartTransactionType = "";
    },

    // 12.GÜN - 3.20 - Grafikte seçilen gelir veya gider türü drill-down işlemi için Redux state içerisinde tutulur.
    setSelectedChartTransactionType: (
      state,
      action,
    ) => {
      state.selectedChartTransactionType =
        action.payload;
    },

    // 12.GÜN - 3.20 - Grafikteki seçili drill-down işlemi temizlenir.
    clearSelectedChartTransactionType: (
      state,
    ) => {
      state.selectedChartTransactionType = "";
    },
  },

  extraReducers: (builder) => {
    // =====================================================
    // 12.GÜN - 3.19
    //
    // Dashboard hesaplaması başlatıldığında yüklenme
    // durumu aktif hale getirilir.
    // =====================================================

    builder.addCase(
      calculateDashboard.pending,
      (state) => {
        state.status = "loading";

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
      (state, action) => {
        state.status = "succeeded";

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
      (state, action) => {
        state.status = "failed";

        state.error =
          action.error?.message ||
          "Dashboard hesaplanırken bir hata oluştu.";
      },
    );
  },
});

export const {
  clearDashboardError,
  setDashboardFilter,
  clearDashboardFilters,
  setSelectedChartTransactionType,
  clearSelectedChartTransactionType,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;