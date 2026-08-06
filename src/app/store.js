import {
  configureStore,
} from "@reduxjs/toolkit";

import authReducer from "../features/auth/presentation/authSlice";
import catalogReducer from "../features/catalog/presentation/catalogSlice";
import categoryReducer from "../features/categories/presentation/categorySlice";
import creditCardReducer from "../features/creditCards/presentation/creditCardSlice";
import transactionReducer from "../features/transactions/presentation/transactionSlice";

// 1.GÜN - Uygulamanın Redux store yapısı oluşturuldu.
export const store =
  configureStore({
    reducer: {
      auth: authReducer,

      // 3.GÜN - Gelir ve gider kayıtları Redux store içerisine eklendi.
      transactions:
        transactionReducer,

      // 5.GÜN - Sınırsız kategori ağacı Redux store içerisine eklendi.
      categories:
        categoryReducer,

      // 6.GÜN - Firma, şube, marka ve ürün katalog bilgileri Redux store içerisine eklendi.
      catalog:
        catalogReducer,

      // 9.GÜN - Kredi kartı kayıtları Redux store içerisine eklendi.
      creditCards:
        creditCardReducer,
    },
  });