const selectCatalogState = (state) =>
  state.catalog;

// 6.GÜN - Firma kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectMerchants = (state) =>
  selectCatalogState(state).merchants;

// 6.GÜN - Şube kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectBranches = (state) =>
  selectCatalogState(state).branches;

// 6.GÜN - Marka kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectBrands = (state) =>
  selectCatalogState(state).brands;

// 6.GÜN - Ürün kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectProducts = (state) =>
  selectCatalogState(state).products;

// 6.GÜN - Katalog bilgilerinin yüklenme durumunu alan selector oluşturuldu.
export const selectCatalogLoadStatus =
  (state) =>
    selectCatalogState(
      state,
    ).loadStatus;

// 6.GÜN - Katalog ekleme işlemlerinin durumunu alan selector oluşturuldu.
export const selectCatalogMutationStatus =
  (state) =>
    selectCatalogState(
      state,
    ).mutationStatus;

// 6.GÜN - Katalog işlemlerindeki hata bilgisini alan selector oluşturuldu.
export const selectCatalogError = (state) =>
  selectCatalogState(state).error;

// 6.GÜN - Seçilen firmaya ait şubeleri getiren selector oluşturuldu.
export const selectBranchesByMerchantId =
  (state, merchantId) =>
    selectBranches(state).filter(
      (branch) =>
        branch.merchantId ===
        merchantId,
    );