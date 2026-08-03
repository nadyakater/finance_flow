import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createCategory,
  getCategories,
} from "../infrastructure/firebaseCategoryRepository";

// =====================================================
// 5.GÜN
// 3.7 - Sınırsız Kategori Ağacı
// Kategori işlemleri için Redux Thunk yapısı oluşturuldu.
// =====================================================

// 5.GÜN - Firestore'dan kategori listesini getirir.
export const loadCategories =
  createAsyncThunk(
    "categories/loadCategories",
    async (
      userId,
      { rejectWithValue },
    ) => {
      try {
        return await getCategories(
          userId,
        );
      } catch (error) {
        console.error(
          "Category load error:",
          error,
        );

        return rejectWithValue(
          "Kategoriler getirilemedi.",
        );
      }
    },
  );

// 5.GÜN - Yeni kategori oluşturur.
export const addCategory =
  createAsyncThunk(
    "categories/addCategory",
    async (
      {
        userId,
        name,
        parentId,
      },
      { rejectWithValue },
    ) => {
      try {
        return await createCategory(
          userId,
          {
            name,
            parentId,
          },
        );
      } catch (error) {
        console.error(
          "Category create error:",
          error,
        );

        return rejectWithValue(
          "Kategori eklenemedi.",
        );
      }
    },
  );