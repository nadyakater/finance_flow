// 1.GÜN - Kullanıcı giriş bilgileri için Redux selector yapısı oluşturuldu.

export const selectCurrentUser = (state) =>
  state.auth.currentUser;

export const selectAuthStatus = (state) =>
  state.auth.status;

export const selectAuthInitialized = (state) =>
  state.auth.isInitialized;

export const selectAuthError = (state) =>
  state.auth.error;