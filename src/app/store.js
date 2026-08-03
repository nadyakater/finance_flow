import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/presentation/authSlice";
import transactionReducer from "../features/transactions/presentation/transactionSlice";

// =====================================================
// 5.GÜN
// 3.7 - Sınırsız Kategori Ağacı
// Category Redux modülü store'a eklendi.
// =====================================================
import categoryReducer from "../features/categories/presentation/categorySlice";

// 1.GÜN - Uygulamanın Redux store yapısı oluşturuldu.
export const store = configureStore({
  reducer: {
    auth: authReducer,

    // 3.GÜN - Gelir ve gider kayıtları Redux store içerisine eklendi.
    transactions: transactionReducer,

    // 5.GÜN - Kategori yönetimi Redux store'a eklendi.
    categories: categoryReducer,
  },
});