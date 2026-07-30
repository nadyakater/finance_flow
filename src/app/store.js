import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/presentation/authSlice";

// 1.GÜN - Uygulamanın Redux store yapısı oluşturuldu.
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});