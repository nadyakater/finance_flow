// =====================================================
// 5.GÜN
// 3.7 - Sınırsız Kategori Ağacı
// Redux Category Selectors oluşturuldu.
// =====================================================

// Tüm kategorileri getirir.
export const selectCategories = (state) =>
  state.categories.items;

// Kategorilerin yüklenme durumunu getirir.
export const selectCategoryLoadStatus = (state) =>
  state.categories.loadStatus;

// Kategori kayıt durumunu getirir.
export const selectCategorySaveStatus = (state) =>
  state.categories.saveStatus;

// Oluşan hatayı getirir.
export const selectCategoryError = (state) =>
  state.categories.error;