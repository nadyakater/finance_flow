import { createSlice } from "@reduxjs/toolkit";

import {
  addBranch,
  addBrand,
  addMerchant,
  addProduct,
  loadCatalog,
} from "../application/catalogThunks";

const initialState = {
  merchants: [],
  branches: [],
  brands: [],
  products: [],
  loadStatus: "idle",
  mutationStatus: "idle",
  error: null,
};

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(
        loadCatalog.pending,
        (state) => {
          state.loadStatus = "loading";
          state.error = null;
        },
      )
      .addCase(
        loadCatalog.fulfilled,
        (state, action) => {
          state.merchants =
            action.payload.merchants;

          state.branches =
            action.payload.branches;

          state.brands =
            action.payload.brands;

          state.products =
            action.payload.products;

          state.loadStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        loadCatalog.rejected,
        (state, action) => {
          state.loadStatus = "failed";

          state.error =
            action.payload ??
            "Katalog bilgileri getirilemedi.";
        },
      )
      .addCase(
        addMerchant.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        addMerchant.fulfilled,
        (state, action) => {
          state.merchants.push(
            action.payload,
          );

          state.merchants.sort(
            (firstMerchant, secondMerchant) =>
              firstMerchant.name.localeCompare(
                secondMerchant.name,
                "tr",
              ),
          );

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        addMerchant.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Firma eklenemedi.";
        },
      )
      .addCase(
        addBranch.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        addBranch.fulfilled,
        (state, action) => {
          state.branches.push(
            action.payload,
          );

          state.branches.sort(
            (firstBranch, secondBranch) =>
              firstBranch.name.localeCompare(
                secondBranch.name,
                "tr",
              ),
          );

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        addBranch.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Şube eklenemedi.";
        },
      )
      .addCase(
        addBrand.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        addBrand.fulfilled,
        (state, action) => {
          state.brands.push(
            action.payload,
          );

          state.brands.sort(
            (firstBrand, secondBrand) =>
              firstBrand.name.localeCompare(
                secondBrand.name,
                "tr",
              ),
          );

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        addBrand.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Marka eklenemedi.";
        },
      )
      .addCase(
        addProduct.pending,
        (state) => {
          state.mutationStatus =
            "loading";

          state.error = null;
        },
      )
      .addCase(
        addProduct.fulfilled,
        (state, action) => {
          state.products.push(
            action.payload,
          );

          state.products.sort(
            (firstProduct, secondProduct) =>
              firstProduct.name.localeCompare(
                secondProduct.name,
                "tr",
              ),
          );

          state.mutationStatus =
            "succeeded";

          state.error = null;
        },
      )
      .addCase(
        addProduct.rejected,
        (state, action) => {
          state.mutationStatus =
            "failed";

          state.error =
            action.payload ??
            "Ürün eklenemedi.";
        },
      );
  },
});

// 6.GÜN - Firma, şube, marka ve ürün bilgilerinin Redux state yapısı oluşturuldu.
export default catalogSlice.reducer;