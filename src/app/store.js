import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/presentation/authSlice";
import catalogReducer from "../features/catalog/presentation/catalogSlice";
import categoryReducer from "../features/categories/presentation/categorySlice";
import creditCardReducer from "../features/creditCards/presentation/creditCardSlice";
import installmentReducer from "../features/installments/presentation/installmentSlice";
import statementReducer from "../features/statements/presentation/statementSlice";
import transactionReducer from "../features/transactions/presentation/transactionSlice";
import reportingReducer from "../features/reporting/presentation/reportingSlice";

// =====================================================
// 11.GÜN
// Düzenli giderler, faturalar ve aboneliklerin
// uygulama genelinde Redux üzerinden yönetilebilmesi
// için recurring reducer store içerisine eklendi.
// =====================================================

import recurringReducer from "../features/recurring/presentation/recurringSlice";

// =====================================================
// 11.GÜN - 3.18
//
// Kategori bütçeleri, rollover bilgileri ve tasarruf
// hedeflerinin uygulama genelinde Redux üzerinden
// kullanılabilmesi için budget reducer store'a eklendi.
// =====================================================

import budgetReducer from "../features/budgets/presentation/budgetSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,

    // 3.GÜN - Gelir ve gider kayıtları Redux store içerisine eklendi.
    transactions: transactionReducer,

    // 5.GÜN - Sınırsız kategori ağacı Redux store içerisine eklendi.
    categories: categoryReducer,

    // 6.GÜN - Firma, şube, marka ve ürün katalog bilgileri Redux store içerisine eklendi.
    catalog: catalogReducer,

    // 9.GÜN - Kredi kartı kayıtları Redux store içerisine eklendi.
    creditCards: creditCardReducer,

    // 11.GÜN - Kredi kartı taksit planları Redux store içerisinde tutulur.
    installments: installmentReducer,

    // 11.GÜN - Kredi kartı ekstre dönemleri Redux store içerisinde tutulur.
    statements: statementReducer,

    // 11.GÜN - Kullanıcının seçtiği finansal dönem ayarları Redux store içerisinde tutulur.
    reporting: reportingReducer,

    // =====================================================
    // 11.GÜN - 3.17
    //
    // Düzenli gider, abonelik ve forecast kayıtları
    // Redux store içerisinde tutulur.
    //
    // Burada:
    //
    // - düzenli gider kuralları,
    // - gelecek tahmini ödemeler,
    // - ödenmiş forecast kayıtları,
    // - tahmin / gerçek tutar bilgileri
    //
    // saklanır.
    // =====================================================

    recurring: recurringReducer,

    // =====================================================
    // 11.GÜN - 3.18
    //
    // Bütçe ve hedef bilgileri Redux store'a eklendi.
    //
    // Burada:
    //
    // - kategori bütçeleri,
    // - kategori ağacı bütçeleri,
    // - rollover bilgileri,
    // - tasarruf hedefleri,
    // - bütçe yükleme/güncelleme durumları
    //
    // tutulur.
    // =====================================================

    budgets: budgetReducer,
  },
});
