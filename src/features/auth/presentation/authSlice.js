import { createSlice } from "@reduxjs/toolkit";

import {
  loginUser,
  logoutUser,
} from "../application/authThunks";

const initialState = {
  currentUser: null,
  status: "idle",
  isInitialized: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // 1.GÜN - Firebase oturum kontrolünün başladığı bilgisi Redux'a kaydedildi.
    authInitializationStarted: (state) => {
      state.status = "loading";
      state.error = null;
    },

    // 1.GÜN - Firebase oturum değişikliği Redux state içerisine aktarıldı.
    authStateChanged: (state, action) => {
      state.currentUser = action.payload;
      state.status = "succeeded";
      state.isInitialized = true;
      state.error = null;
    },

    // 1.GÜN - Oturum kontrolü sırasında oluşan hata Redux state içerisine kaydedildi.
    authStateFailed: (state, action) => {
      state.currentUser = null;
      state.status = "failed";
      state.isInitialized = true;
      state.error = action.payload;
    },

    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.status = "succeeded";
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.currentUser = null;
        state.status = "failed";
        state.error =
          action.payload ?? "Giriş işlemi başarısız oldu.";
      })
      .addCase(logoutUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.currentUser = null;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ?? "Çıkış işlemi başarısız oldu.";
      });
  },
});

export const {
  authInitializationStarted,
  authStateChanged,
  authStateFailed,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;