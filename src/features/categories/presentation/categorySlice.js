import { createSlice } from "@reduxjs/toolkit";

import {
  addCategory,
  loadCategories,
} from "../application/categoryThunks";

// =====================================================
// 5.GÜN
// 3.7 - Sınırsız Kategori Ağacı
// Redux üzerinde kategori yönetimi oluşturuldu.
// =====================================================

const initialState = {
  items: [],
  loadStatus: "idle",
  saveStatus: "idle",
  error: null,
};

const categorySlice = createSlice({
  name: "categories",

  initialState,

  reducers: {},

  extraReducers: (builder) => {
    builder

      // 5.GÜN - Firestore'dan kategori listesi getiriliyor.
      .addCase(
        loadCategories.pending,
        (state) => {
          state.loadStatus = "loading";
          state.error = null;
        },
      )

      .addCase(
        loadCategories.fulfilled,
        (state, action) => {
          state.items = action.payload;
          state.loadStatus = "succeeded";
          state.error = null;
        },
      )

      .addCase(
        loadCategories.rejected,
        (state, action) => {
          state.loadStatus = "failed";

          state.error =
            action.payload ??
            "Kategoriler getirilemedi.";
        },
      )

      // 5.GÜN - Yeni kategori başarıyla eklendi.
      .addCase(
        addCategory.pending,
        (state) => {
          state.saveStatus = "loading";
          state.error = null;
        },
      )

      .addCase(
        addCategory.fulfilled,
        (state, action) => {
          state.items.push(action.payload);

          state.saveStatus = "succeeded";
          state.error = null;
        },
      )

      .addCase(
        addCategory.rejected,
        (state, action) => {
          state.saveStatus = "failed";

          state.error =
            action.payload ??
            "Kategori eklenemedi.";
        },
      );
  },
});

export default categorySlice.reducer;