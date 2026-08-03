import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  archiveCategoryDocument,
  createCategoryDocument,
  getCategories,
  moveCategoryDocument,
  restoreCategoryDocument,
} from "../infrastructure/firebaseCategoryRepository";

function getCategoryErrorMessage(
  error,
  fallbackMessage,
) {
  const errorMessages = {
    CATEGORY_NAME_REQUIRED:
      "Kategori adı zorunludur.",

    CATEGORY_PARENT_NOT_FOUND:
      "Seçilen üst kategori bulunamadı.",

    CATEGORY_PARENT_ARCHIVED:
      "Arşivlenmiş bir kategori üst kategori olarak seçilemez.",

    CATEGORY_TYPE_MISMATCH:
      "Kategori türü seçilen üst kategoriyle uyumlu değil.",

    CATEGORY_DUPLICATE:
      "Aynı üst kategori altında bu isimde başka bir kategori bulunuyor.",

    CATEGORY_NOT_FOUND:
      "Seçilen kategori bulunamadı.",

    CATEGORY_INVALID_PARENT:
      "Bir kategori kendi alt kategorisinin içine taşınamaz.",

    CATEGORY_TREE_TOO_LARGE:
      "Kategori ağacı tek işlemde güncellenemeyecek kadar büyük.",
  };

  return (
    errorMessages[error?.message] ??
    fallbackMessage
  );
}

// 5.GÜN - Kategori kayıtlarını getiren Redux thunk oluşturuldu.
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
          getCategoryErrorMessage(
            error,
            "Kategoriler getirilirken bir hata oluştu.",
          ),
        );
      }
    },
  );

// 5.GÜN - Yeni ana veya alt kategori ekleyen Redux thunk oluşturuldu.
export const createCategoryNode =
  createAsyncThunk(
    "categories/createCategoryNode",
    async (
      {
        userId,
        name,
        parentId,
        categoryType,
      },
      { rejectWithValue },
    ) => {
      try {
        return await createCategoryDocument(
          userId,
          {
            name,
            parentId,
            categoryType,
          },
        );
      } catch (error) {
        console.error(
          "Category create error:",
          error,
        );

        return rejectWithValue(
          getCategoryErrorMessage(
            error,
            "Kategori eklenirken bir hata oluştu.",
          ),
        );
      }
    },
  );

// 5.GÜN - Kategori taşıma işlemini yöneten Redux thunk oluşturuldu.
export const moveCategoryNode =
  createAsyncThunk(
    "categories/moveCategoryNode",
    async (
      {
        userId,
        categoryId,
        newParentId,
      },
      { rejectWithValue },
    ) => {
      try {
        return await moveCategoryDocument(
          userId,
          categoryId,
          newParentId,
        );
      } catch (error) {
        console.error(
          "Category move error:",
          error,
        );

        return rejectWithValue(
          getCategoryErrorMessage(
            error,
            "Kategori taşınırken bir hata oluştu.",
          ),
        );
      }
    },
  );

// 5.GÜN - Kategori arşivleme işlemini yöneten Redux thunk oluşturuldu.
export const archiveCategoryNode =
  createAsyncThunk(
    "categories/archiveCategoryNode",
    async (
      {
        userId,
        categoryId,
      },
      { rejectWithValue },
    ) => {
      try {
        return await archiveCategoryDocument(
          userId,
          categoryId,
        );
      } catch (error) {
        console.error(
          "Category archive error:",
          error,
        );

        return rejectWithValue(
          getCategoryErrorMessage(
            error,
            "Kategori arşivlenirken bir hata oluştu.",
          ),
        );
      }
    },
  );

// 5.GÜN - Arşivlenen kategoriyi yeniden aktif hale getiren Redux thunk oluşturuldu.
export const restoreCategoryNode =
  createAsyncThunk(
    "categories/restoreCategoryNode",
    async (
      {
        userId,
        categoryId,
      },
      { rejectWithValue },
    ) => {
      try {
        return await restoreCategoryDocument(
          userId,
          categoryId,
        );
      } catch (error) {
        console.error(
          "Category restore error:",
          error,
        );

        return rejectWithValue(
          getCategoryErrorMessage(
            error,
            "Kategori arşivden çıkarılırken bir hata oluştu.",
          ),
        );
      }
    },
  );