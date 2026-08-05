import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createBranch,
  createBrand,
  createMerchant,
  createProduct,
  getCatalogData,
} from "../infrastructure/firebaseCatalogRepository";

function getCatalogErrorMessage(error, fallbackMessage) {
  if (error?.message === "CATALOG_NAME_REQUIRED") {
    return "Ad alanı zorunludur.";
  }

  if (error?.message === "CATALOG_MERCHANT_REQUIRED") {
    return "Şube eklemek için önce firma seçilmelidir.";
  }

  return fallbackMessage;
}

// 6.GÜN - Firma, şube, marka ve ürün kayıtlarını getiren Redux thunk oluşturuldu.
export const loadCatalog = createAsyncThunk(
  "catalog/loadCatalog",

  async (userId, { rejectWithValue }) => {
    try {
      return await getCatalogData(userId);
    } catch (error) {
      console.error("Catalog load error:", error);

      return rejectWithValue(
        "Firma, şube, marka ve ürün bilgileri getirilemedi.",
      );
    }
  },
);

// 6.GÜN - Yeni firma kaydını oluşturan Redux thunk eklendi.
export const addMerchant = createAsyncThunk(
  "catalog/addMerchant",

  async ({ userId, name }, { rejectWithValue }) => {
    try {
      return await createMerchant(userId, {
        name,
      });
    } catch (error) {
      console.error("Merchant create error:", error);

      return rejectWithValue(
        getCatalogErrorMessage(error, "Firma eklenirken bir hata oluştu."),
      );
    }
  },
);

// 6.GÜN - Seçilen firmaya bağlı yeni şube kaydını oluşturan Redux thunk eklendi.
export const addBranch = createAsyncThunk(
  "catalog/addBranch",

  async (
    { userId, merchantId, merchantName, name, address },
    { rejectWithValue },
  ) => {
    try {
      return await createBranch(userId, {
        merchantId,
        merchantName,
        name,
        address,
      });
    } catch (error) {
      console.error("Branch create error:", error);

      return rejectWithValue(
        getCatalogErrorMessage(error, "Şube eklenirken bir hata oluştu."),
      );
    }
  },
);

// 6.GÜN - Gider satırlarında kullanılacak yeni marka kaydını oluşturan Redux thunk eklendi.
export const addBrand = createAsyncThunk(
  "catalog/addBrand",

  async ({ userId, name }, { rejectWithValue }) => {
    try {
      return await createBrand(userId, {
        name,
      });
    } catch (error) {
      console.error("Brand create error:", error);

      return rejectWithValue(
        getCatalogErrorMessage(error, "Marka eklenirken bir hata oluştu."),
      );
    }
  },
);

// 6.GÜN - Marka ve alternatif ad bilgileriyle yeni ürün kaydı oluşturan Redux thunk eklendi.
// 8.GÜN - Ürün türü ve yakıt türü alanları thunka eklendi.
export const addProduct = createAsyncThunk(
  "catalog/addProduct",

  async (
    { userId, name, aliases, brandId, brandName, productType, fuelType },
    { rejectWithValue },
  ) => {
    try {
      return await createProduct(userId, {
        name,
        aliases,
        brandId,
        brandName,
        productType,
        fuelType,
      });
    } catch (error) {
      console.error("Product create error:", error);

      return rejectWithValue(
        getCatalogErrorMessage(error, "Ürün eklenirken bir hata oluştu."),
      );
    }
  },
);
