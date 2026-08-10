import { createSlice } from "@reduxjs/toolkit";

import {
  addBudget,
  addSavingsTarget,
  changeBudgetActiveStatus,
  changeBudgetAmount,
  changeBudgetDescendantSetting,
  changeSavingsTargetActiveStatus,
  loadBudgets,
  loadSavingsTargets,
} from "../application/budgetThunks";

// =====================================================
// 11.GÜN - Bütçe ve hedef Redux state yapısı
//
// Kullanıcının:
//
// - kategori bütçeleri,
// - kategori ağacı bütçeleri,
// - rollover bilgileri,
// - tasarruf hedefleri,
// - yüklenme ve kayıt durumları,
// - hata mesajları
//
// Redux içerisinde tutulur.
// =====================================================

const initialState = {
  // =====================================================
  // 11.GÜN
  // Kullanıcının oluşturduğu bütün kategori bütçeleri.
  // =====================================================

  budgets: [],

  // =====================================================
  // 11.GÜN
  // Kullanıcının oluşturduğu tasarruf hedefleri.
  // =====================================================

  savingsTargets: [],

  // =====================================================
  // 11.GÜN
  // Bütçelerin Firestore'dan yüklenme durumu.
  //
  // idle
  // loading
  // succeeded
  // failed
  // =====================================================

  budgetLoadStatus: "idle",

  // =====================================================
  // 11.GÜN
  // Tasarruf hedeflerinin Firestore'dan yüklenme durumu.
  // =====================================================

  savingsTargetLoadStatus: "idle",

  // =====================================================
  // 11.GÜN
  // Bütçe veya tasarruf hedefi ekleme/güncelleme
  // işlemlerinin durumunu tutar.
  // =====================================================

  mutationStatus: "idle",

  // =====================================================
  // 11.GÜN
  // Bütçe ve hedef işlemlerinde oluşan hata mesajı.
  // =====================================================

  error: null,
};

// =====================================================
// 11.GÜN
// Bütçe ve hedef yönetimi için Redux slice oluşturuldu.
// =====================================================

const budgetSlice = createSlice({
  name: "budgets",

  initialState,

  reducers: {
    // =====================================================
    // 11.GÜN
    // Kullanıcı çıkış yaptığında bütçe state'ini
    // başlangıç haline döndürür.
    // =====================================================

    resetBudgetState: () => initialState,

    // =====================================================
    // 11.GÜN
    // Kullanıcıya gösterilen bütçe hata mesajını temizler.
    // =====================================================

    clearBudgetError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // =====================================================
      // 11.GÜN
      // Bütçeler yüklenirken.
      // =====================================================

      .addCase(loadBudgets.pending, (state) => {
        state.budgetLoadStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Bütçeler başarıyla Firestore'dan yüklendiğinde
      // Redux state'e yazılır.
      // =====================================================

      .addCase(loadBudgets.fulfilled, (state, action) => {
        state.budgetLoadStatus = "succeeded";

        state.budgets = action.payload;

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Bütçeler yüklenemezse hata tutulur.
      // =====================================================

      .addCase(loadBudgets.rejected, (state, action) => {
        state.budgetLoadStatus = "failed";

        state.error = action.payload ?? "Bütçeler yüklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Yeni bütçe oluşturulurken.
      // =====================================================

      .addCase(addBudget.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Yeni bütçe başarıyla oluşturulduğunda
      // bütçe listesine eklenir.
      // =====================================================

      .addCase(addBudget.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.budgets.unshift(action.payload);

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Bütçe eklenemezse hata tutulur.
      // =====================================================

      .addCase(addBudget.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Bütçe eklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Bütçe limiti güncellenirken.
      // =====================================================

      .addCase(changeBudgetAmount.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Bütçe tutarı değiştiğinde listedeki eski kayıt
      // güncel kayıtla değiştirilir.
      // =====================================================

      .addCase(changeBudgetAmount.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.budgets = state.budgets.map((budget) =>
          budget.id === action.payload.id ? action.payload : budget,
        );

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Bütçe limiti güncellenemezse hata tutulur.
      // =====================================================

      .addCase(changeBudgetAmount.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Bütçe tutarı güncellenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Alt kategori dahil etme ayarı değiştirilirken.
      // =====================================================

      .addCase(changeBudgetDescendantSetting.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Parent bütçenin descendant ayarı değiştiğinde
      // Redux listesi güncellenir.
      // =====================================================

      .addCase(changeBudgetDescendantSetting.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.budgets = state.budgets.map((budget) =>
          budget.id === action.payload.id ? action.payload : budget,
        );

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Alt kategori ayarı güncellenemezse hata tutulur.
      // =====================================================

      .addCase(changeBudgetDescendantSetting.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error =
          action.payload ?? "Kategori ağacı bütçe ayarı güncellenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Bütçe aktif/pasif yapılırken.
      // =====================================================

      .addCase(changeBudgetActiveStatus.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Bütçe aktiflik durumu değiştiğinde
      // Redux listesi güncellenir.
      // =====================================================

      .addCase(changeBudgetActiveStatus.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.budgets = state.budgets.map((budget) =>
          budget.id === action.payload.id ? action.payload : budget,
        );

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Bütçe aktiflik durumu değiştirilemezse.
      // =====================================================

      .addCase(changeBudgetActiveStatus.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Bütçe durumu güncellenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Tasarruf hedefleri yüklenirken.
      // =====================================================

      .addCase(loadSavingsTargets.pending, (state) => {
        state.savingsTargetLoadStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Tasarruf hedefleri başarıyla yüklendiğinde
      // Redux state'e yazılır.
      // =====================================================

      .addCase(loadSavingsTargets.fulfilled, (state, action) => {
        state.savingsTargetLoadStatus = "succeeded";

        state.savingsTargets = action.payload;

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Tasarruf hedefleri yüklenemezse.
      // =====================================================

      .addCase(loadSavingsTargets.rejected, (state, action) => {
        state.savingsTargetLoadStatus = "failed";

        state.error = action.payload ?? "Tasarruf hedefleri yüklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Yeni tasarruf hedefi oluşturulurken.
      // =====================================================

      .addCase(addSavingsTarget.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Yeni tasarruf hedefi oluşturulduğunda
      // hedef listesine eklenir.
      // =====================================================

      .addCase(addSavingsTarget.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.savingsTargets.unshift(action.payload);

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Tasarruf hedefi eklenemezse.
      // =====================================================

      .addCase(addSavingsTarget.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error = action.payload ?? "Tasarruf hedefi eklenemedi.";
      })

      // =====================================================
      // 11.GÜN
      // Tasarruf hedefi aktif/pasif yapılırken.
      // =====================================================

      .addCase(changeSavingsTargetActiveStatus.pending, (state) => {
        state.mutationStatus = "loading";

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Tasarruf hedefinin aktiflik durumu değiştiğinde
      // Redux listesi güncellenir.
      // =====================================================

      .addCase(changeSavingsTargetActiveStatus.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";

        state.savingsTargets = state.savingsTargets.map((target) =>
          target.id === action.payload.id ? action.payload : target,
        );

        state.error = null;
      })

      // =====================================================
      // 11.GÜN
      // Tasarruf hedefinin aktiflik durumu değiştirilemezse.
      // =====================================================

      .addCase(changeSavingsTargetActiveStatus.rejected, (state, action) => {
        state.mutationStatus = "failed";

        state.error =
          action.payload ?? "Tasarruf hedefi durumu güncellenemedi.";
      });
  },
});

// =====================================================
// 11.GÜN
// Normal reducer actionları dışarı aktarılır.
// =====================================================

export const { resetBudgetState, clearBudgetError } = budgetSlice.actions;

// =====================================================
// 11.GÜN
// Redux store içerisine eklemek için reducer
// dışarı aktarılır.
// =====================================================

export default budgetSlice.reducer;
