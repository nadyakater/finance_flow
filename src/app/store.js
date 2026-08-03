// src/app/store.js

import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/presentation/authSlice";
import categoryReducer from "../features/categories/presentation/categorySlice";
import transactionReducer from "../features/transactions/presentation/transactionSlice";

// 1.GÜN - Uygulamanın Redux store yapısı oluşturuldu.
export const store = configureStore({
  reducer: {
    auth: authReducer,

    // 3.GÜN - Gelir ve gider kayıtları Redux store içerisine eklendi.
    transactions: transactionReducer,

    // 5.GÜN - Sınırsız kategori ağacı Redux store içerisine eklendi.
    categories: categoryReducer,
  },
});