import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  loginWithEmailAndPassword,
  logoutFromFirebase,
} from "../infrastructure/firebaseAuthRepository";

function getAuthErrorMessage(error) {
  switch (error.code) {
    case "auth/invalid-credential":
      return "E-posta veya şifre hatalı.";

    case "auth/invalid-email":
      return "Geçerli bir e-posta adresi girin.";

    case "auth/user-disabled":
      return "Bu kullanıcı hesabı devre dışı bırakılmış.";

    case "auth/too-many-requests":
      return "Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.";

    case "permission-denied":
      return "Kullanıcı bilgileri kaydedilemedi. Firestore izinlerini kontrol edin.";

    case "unavailable":
      return "Firebase hizmetine şu anda ulaşılamıyor.";

    default:
      return "İşlem sırasında beklenmeyen bir hata oluştu.";
  }
}

// 1.GÜN - Giriş işlemi Redux thunk yapısına taşındı.
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      return await loginWithEmailAndPassword(
        email.trim(),
        password,
      );
    } catch (error) {
      console.error("Giriş hatası:", error);

      return rejectWithValue(getAuthErrorMessage(error));
    }
  },
);

// 1.GÜN - Çıkış işlemi Redux thunk yapısına taşındı.
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await logoutFromFirebase();
    } catch (error) {
      console.error("Çıkış hatası:", error);

      return rejectWithValue(
        "Çıkış yapılırken bir hata oluştu.",
      );
    }
  },
);

export { getAuthErrorMessage };