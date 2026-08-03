import { createSlice } from "@reduxjs/toolkit";

import {
  archiveCategoryNode,
  createCategoryNode,
  loadCategories,
  moveCategoryNode,
  restoreCategoryNode,
} from "../application/categoryThunks";

const initialState = {
  items: [],
  loadStatus: "idle",
  mutationStatus: "idle",
  error: null,
};

function sortCategories(categories) {
  return [...categories].sort(
    (firstCategory, secondCategory) =>
      firstCategory.pathNames
        .join(" > ")
        .localeCompare(
          secondCategory.pathNames.join(
            " > ",
          ),
          "tr",
        ),
  );
}

const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
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
          state.items =
            sortCategories(
              action.payload,
            );

          state.loadStatus =
            "succeeded";

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
      .addCase(
        createCategoryNode.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        createCategoryNode.fulfilled,
        (state, action) => {
          state.items =
            sortCategories([
              ...state.items,
              action.payload,
            ]);

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        createCategoryNode.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Kategori eklenemedi.";
        },
      )
      .addCase(
        moveCategoryNode.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        moveCategoryNode.fulfilled,
        (state, action) => {
          state.items =
            sortCategories(
              action.payload,
            );

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        moveCategoryNode.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Kategori taşınamadı.";
        },
      )
      .addCase(
        archiveCategoryNode.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        archiveCategoryNode.fulfilled,
        (state, action) => {
          const archivedCategoryIds =
            action.payload;

          state.items =
            state.items.map(
              (category) =>
                archivedCategoryIds.includes(
                  category.id,
                )
                  ? {
                      ...category,
                      isArchived: true,
                    }
                  : category,
            );

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        archiveCategoryNode.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Kategori arşivlenemedi.";
        },
      )
      .addCase(
        restoreCategoryNode.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        restoreCategoryNode.fulfilled,
        (state, action) => {
          const restoredCategoryIds =
            action.payload;

          state.items =
            state.items.map(
              (category) =>
                restoredCategoryIds.includes(
                  category.id,
                )
                  ? {
                      ...category,
                      isArchived: false,
                    }
                  : category,
            );

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        restoreCategoryNode.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Kategori arşivden çıkarılamadı.";
        },
      );
  },
});

// 5.GÜN - Kategori ağacının Redux state yapısı oluşturuldu.
export default categorySlice.reducer;