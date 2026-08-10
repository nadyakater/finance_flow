import { useEffect, useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";

import { logoutUser } from "../features/auth/application/authThunks";

import {
  selectAuthStatus,
  selectCurrentUser,
} from "../features/auth/presentation/authSelectors";

import { loadCategories } from "../features/categories/application/categoryThunks";

import { selectActiveCategories } from "../features/categories/presentation/categorySelectors";

import { loadCatalog } from "../features/catalog/application/catalogThunks";

import { loadCreditCards } from "../features/creditCards/application/creditCardThunks";

import { loadTransactions } from "../features/transactions/application/transactionThunks";

import { selectTransactions } from "../features/transactions/presentation/transactionSelectors";

// =====================================================
// 11.GÜN - 3.18
//
// Bütçeler seçilen finansal döneme göre oluşturulduğu
// için Admin Paneli açıldığında kullanıcının raporlama
// dönemi ayarları da yüklenir.
// =====================================================

import { loadReportingSettings } from "../features/reporting/application/reportingThunks";

import CategorySection from "../components/categories/CategorySection";

import CatalogSection from "../features/catalog/presentation/components/CatalogSection";

import CreditCardSection from "../features/creditCards/presentation/components/CreditCardSection";

import ProductAnalysis from "../features/transactions/presentation/components/ProductAnalysis";

import FuelAnalysis from "../features/transactions/presentation/components/FuelAnalysis";

// =====================================================
// 11.GÜN - 3.17
//
// Düzenli giderler, faturalar ve abonelikler
// Admin Paneli içerisinde yönetilir.
// =====================================================

import RecurringExpenseSection from "../features/recurring/presentation/components/RecurringExpenseSection";

// =====================================================
// 11.GÜN - 3.18
//
// Kategori bütçesi, rollover ve tasarruf hedefi
// yönetim bölümü Admin Paneli'ne bağlandı.
// =====================================================

import BudgetSection from "../features/budgets/presentation/components/BudgetSection";

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleString("tr-TR");
}

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  });
}

function convertInputAmountToMinor(amount) {
  if (amount === "" || amount === null || amount === undefined) {
    return 0;
  }

  const normalizedAmount =
    typeof amount === "string" ? amount.replace(",", ".") : amount;

  const numericAmount = Number(normalizedAmount);

  if (!Number.isFinite(numericAmount)) {
    return 0;
  }

  return Math.round(numericAmount * 100);
}

function getTransactionCategoryPathIds(transaction, categories) {
  if (
    Array.isArray(transaction.categoryPathIds) &&
    transaction.categoryPathIds.length > 0
  ) {
    return transaction.categoryPathIds;
  }

  if (transaction.categoryId) {
    return [transaction.categoryId];
  }

  const expectedCategoryType =
    transaction.transactionType === "Gelir" ? "income" : "expense";

  const matchedCategory = categories.find(
    (category) =>
      category.name === transaction.category &&
      (category.categoryType === expectedCategoryType ||
        category.categoryType === "both"),
  );

  return matchedCategory?.pathIds ?? [];
}

function getTransactionCategoryItems(transaction, categories) {
  if (Array.isArray(transaction.lines) && transaction.lines.length > 0) {
    return transaction.lines.map((line) => {
      const lineAmountMinor = Number.isInteger(line.netAmountMinor)
        ? line.netAmountMinor
        : Number.isInteger(line.grossAmountMinor)
          ? line.grossAmountMinor -
            Number(line.lineDiscountMinor ?? 0) -
            Number(line.allocatedTransactionDiscountMinor ?? 0)
          : convertInputAmountToMinor(line.amount);

      return {
        categoryId: line.categoryId ?? "",

        categoryPathIds: Array.isArray(line.categoryPathIds)
          ? line.categoryPathIds
          : line.categoryId
            ? [line.categoryId]
            : [],

        amountMinor: lineAmountMinor,
      };
    });
  }

  return [
    {
      categoryId: transaction.categoryId ?? "",

      categoryPathIds: getTransactionCategoryPathIds(transaction, categories),

      amountMinor: Number(transaction.amountMinor ?? 0),
    },
  ];
}

// =====================================================
// 10.GÜN
// Kategori, katalog, kredi kartı ve analiz bölümleri
// için Admin sayfası oluşturuldu.
// =====================================================

// =====================================================
// 11.GÜN
//
// Admin Paneli yönetim özellikleri genişletildi.
//
// 3.17:
// Düzenli giderler, faturalar ve abonelikler.
//
// 3.18:
// Kategori bütçeleri, rollover ve tasarruf hedefleri.
//
// aynı yönetim ekranında toplandı.
// =====================================================

function Admin({ onNavigateHome }) {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const authStatus = useSelector(selectAuthStatus);

  const transactions = useSelector(selectTransactions);

  const activeCategories = useSelector(selectActiveCategories);

  const isLoggingOut = authStatus === "loading";

  // =====================================================
  // 10.GÜN
  // Kategori yönetim ekranında gösterilen gelir ve gider
  // toplamları hesaplanır.
  //
  // Parent kategoriler kendi descendant kategorilerinin
  // tutarlarını da kapsar.
  // =====================================================

  const categoryTotals = useMemo(() => {
    const totals = {};

    activeCategories.forEach((category) => {
      totals[category.id] = {
        incomeMinor: 0,

        expenseMinor: 0,
      };
    });

    transactions.forEach((transaction) => {
      const categoryItems = getTransactionCategoryItems(
        transaction,
        activeCategories,
      );

      categoryItems.forEach((categoryItem) => {
        categoryItem.categoryPathIds.forEach((pathCategoryId) => {
          if (!totals[pathCategoryId]) {
            return;
          }

          if (transaction.transactionType === "Gelir") {
            totals[pathCategoryId].incomeMinor += categoryItem.amountMinor;

            return;
          }

          if (transaction.transactionType === "İade") {
            totals[pathCategoryId].expenseMinor -= categoryItem.amountMinor;

            return;
          }

          totals[pathCategoryId].expenseMinor += categoryItem.amountMinor;
        });
      });
    });

    return totals;
  }, [activeCategories, transactions]);

  // =====================================================
  // 11.GÜN
  // Admin Paneli açıldığında yönetim ve analiz
  // bölümleri için gerekli temel veriler yüklenir.
  //
  // 3.18 bütçe hesaplamalarının doğru finansal dönemi
  // kullanabilmesi için reporting settings de burada
  // yüklenir.
  //
  // RecurringExpenseSection ve BudgetSection kendi
  // verilerini kendi componentleri içerisinde yükler.
  // =====================================================

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    // =====================================================
    // İşlemler kategori bütçesi ve analizlerde kullanılır.
    // =====================================================

    dispatch(loadTransactions(currentUser.id));

    // =====================================================
    // Kategoriler hem kategori yönetiminde hem 3.18
    // bütçe oluşturma ekranında kullanılır.
    // =====================================================

    dispatch(loadCategories(currentUser.id));

    // =====================================================
    // Firma, şube, marka ve ürün katalogları yüklenir.
    // =====================================================

    dispatch(loadCatalog(currentUser.id));

    // =====================================================
    // Kredi kartı yönetimi için kartlar yüklenir.
    // =====================================================

    dispatch(loadCreditCards(currentUser.id));

    // =====================================================
    // 11.GÜN - 3.18
    //
    // Aktif bütçe dönemi kullanıcının seçtiği finansal
    // döneme bağlı olduğu için raporlama ayarları
    // Firestore'dan yüklenir.
    // =====================================================

    dispatch(loadReportingSettings(currentUser.id));
  }, [dispatch, currentUser?.id]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  return (
    <div className="page-container dashboard-page-container">
      <div className="welcome-card transaction-card">
        {/* =====================================================
            10.GÜN
            Admin sayfasına ana sayfaya dönüş ve çıkış
            işlemleri eklendi.
            ===================================================== */}

        <div className="dashboard-header admin-header">
          <div className="dashboard-header-content">
            <h1 className="welcome-title">Admin Paneli</h1>

            <p className="page-description">
              Yönetim ve analiz bölümlerine erişim sağlandı.
            </p>

            <p className="user-email">{currentUser?.email}</p>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="home-button"
              type="button"
              onClick={onNavigateHome}
            >
              Ana Sayfaya Dön
            </button>

            <button
              className="logout-button dashboard-logout-button"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
            </button>
          </div>
        </div>

        {/* =====================================================
            Kategori Yönetimi
            ===================================================== */}

        <CategorySection
          categoryTotals={categoryTotals}
          formatAmount={formatAmount}
        />

        {/* =====================================================
            Firma / Şube / Marka / Ürün Yönetimi
            ===================================================== */}

        <CatalogSection />

        {/* =====================================================
            Kredi Kartı Yönetimi
            ===================================================== */}

        <CreditCardSection />

        {/* =====================================================
            11.GÜN - 3.17
            DÜZENLİ GİDERLER VE ABONELİKLER

            Bu bölüm Admin Paneli içerisinde tutulur.

            Kullanıcı burada:

            - kira,
            - internet,
            - sigorta,
            - abonelik

            gibi tekrar eden giderleri tanımlayabilir.

            Forecast kayıtları gerçek transaction değildir.

            Gerçek ödeme yapıldığında actual tutar kaydedilir
            ve normal gider transaction'ı oluşturulur.
            ===================================================== */}

        <RecurringExpenseSection />

        {/* =====================================================
            11.GÜN - 3.18
            BÜTÇE VE HEDEFLER

            Kullanıcı burada:

            - kategori bütçesi oluşturabilir,
            - kategori ağacını bütçeye dahil edebilir,
            - bütçe limitini görebilir,
            - kullanılan ve kalan tutarı takip edebilir,
            - rollover kullanabilir,
            - tasarruf hedefi belirleyebilir.

            Bütçe hesapları aktif finansal dönem ve
            gerçek transaction kayıtlarına göre yapılır.
            ===================================================== */}

        <BudgetSection />

        {/* =====================================================
            Ürün Fiyat Analizi
            ===================================================== */}

        <ProductAnalysis formatDate={formatDate} formatAmount={formatAmount} />

        {/* =====================================================
            Yakıt Analizi
            ===================================================== */}

        <FuelAnalysis formatDate={formatDate} formatAmount={formatAmount} />
      </div>
    </div>
  );
}

export default Admin;
