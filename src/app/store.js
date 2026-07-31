import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/presentation/authSlice";
import transactionReducer from "../features/transactions/presentation/transactionSlice";

// 1.GÜN - Uygulamanın Redux store yapısı oluşturuldu.
export const store = configureStore({
  reducer: {
    auth: authReducer,

    // 3.GÜN - Gelir ve gider kayıtları Redux store içerisine eklendi.
    transactions: transactionReducer,
  },
});