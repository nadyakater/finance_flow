import { useEffect, useMemo, useState } from "react";

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

import { loadInstallmentPlans } from "../features/installments/application/installmentThunks";

import { selectTotalInstallmentDebtMinor } from "../features/installments/presentation/installmentSelectors";

import { loadStatementPeriods } from "../features/statements/application/statementThunks";

import { loadReportingSettings } from "../features/reporting/application/reportingThunks";

import ReportingPeriodSettings from "../features/reporting/presentation/components/ReportingPeriodSettings";

import { loadTransactions } from "../features/transactions/application/transactionThunks";

import {
  selectNetBalanceMinor,
  selectNetExpenseMinor,
  selectTotalIncomeMinor,
  selectTotalRefundMinor,
  selectTransactionError,
  selectTransactionLoadStatus,
  selectTransactionSuccessMessage,
  selectTransactions,
} from "../features/transactions/presentation/transactionSelectors";

import {
  clearTransactionError,
  clearTransactionMessage,
} from "../features/transactions/presentation/transactionSlice";

import TransactionForm from "../features/transactions/presentation/components/TransactionForm";

import FinanceSummary from "../features/transactions/presentation/components/FinanceSummary";

import CategoryFilter from "../features/transactions/presentation/components/CategoryFilter";

import TransactionTable from "../features/transactions/presentation/components/TransactionTable";

import GlobalSearch from "../features/search/presentation/components/GlobalSearch";

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleString("tr-TR");
}

function formatTransactionDate(transactionDate, createdAtUtc) {
  if (transactionDate) {
    return new Date(`${transactionDate}T00:00:00`).toLocaleDateString("tr-TR");
  }

  return formatDate(createdAtUtc);
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

function getTodayDateValue() {
  const currentDate = new Date();

  const timezoneOffset = currentDate.getTimezoneOffset() * 60 * 1000;

  return new Date(currentDate.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
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

function getTransactionCategoryLabel(transaction) {
  if (Array.isArray(transaction.lines) && transaction.lines.length > 0) {
    const categoryLabels = transaction.lines
      .map((line) => line.categoryPath || line.category)
      .filter(Boolean);

    const uniqueCategoryLabels = [...new Set(categoryLabels)];

    if (uniqueCategoryLabels.length > 0) {
      return uniqueCategoryLabels.join(" | ");
    }
  }

  return transaction.categoryPath || transaction.category || "-";
}

// =====================================================
// 12.GÜN - 3.19
//
// Dashboard sayfasına geçiş yapılabilmesi için
// onNavigateDashboard fonksiyonu alınır.
// =====================================================

function Anasayfa({ onNavigateAdmin, onNavigateDashboard }) {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const authStatus = useSelector(selectAuthStatus);

  const transactions = useSelector(selectTransactions);

  const transactionLoadStatus = useSelector(selectTransactionLoadStatus);

  const transactionError = useSelector(selectTransactionError);

  const transactionSuccessMessage = useSelector(
    selectTransactionSuccessMessage,
  );

  const activeCategories = useSelector(selectActiveCategories);

  const totalIncomeMinor = useSelector(selectTotalIncomeMinor);

  const netExpenseMinor = useSelector(selectNetExpenseMinor);

  const totalRefundMinor = useSelector(selectTotalRefundMinor);

  const netBalanceMinor = useSelector(selectNetBalanceMinor);

  const totalDebtMinor = useSelector(selectTotalInstallmentDebtMinor);

  const [selectedFilterCategoryIds, setSelectedFilterCategoryIds] = useState(
    [],
  );

  const [includeDescendants, setIncludeDescendants] = useState(true);

  // Kullanıcı ana sayfada aynı anda yalnızca ihtiyaç duyduğu çalışma alanını görür.
  // Bu düzenleme mevcut özellikleri kaldırmadan ekran kalabalığını azaltır.
  const [activeHomeSection, setActiveHomeSection] = useState("summary");

  const isLoggingOut = authStatus === "loading";

  const filteredTransactions = useMemo(() => {
    if (selectedFilterCategoryIds.length === 0) {
      return transactions;
    }

    return transactions.filter((transaction) => {
      const categoryItems = getTransactionCategoryItems(
        transaction,
        activeCategories,
      );

      return selectedFilterCategoryIds.some((filterCategoryId) =>
        categoryItems.some((categoryItem) =>
          includeDescendants
            ? categoryItem.categoryPathIds.includes(filterCategoryId)
            : categoryItem.categoryId === filterCategoryId,
        ),
      );
    });
  }, [
    activeCategories,
    includeDescendants,
    selectedFilterCategoryIds,
    transactions,
  ]);

  // =====================================================
  // 11.GÜN
  // Ana sayfada kullanılacak finansal veriler yüklenir.
  //
  // 3.17 kapsamındaki düzenli gider ve abonelik yönetimi
  // Admin Paneli'ne taşındığı için recurring verileri
  // burada yüklenmez.
  // =====================================================

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    dispatch(loadTransactions(currentUser.id));

    dispatch(loadCategories(currentUser.id));

    dispatch(loadCatalog(currentUser.id));

    dispatch(loadCreditCards(currentUser.id));

    dispatch(loadInstallmentPlans(currentUser.id));

    dispatch(loadStatementPeriods(currentUser.id));

    dispatch(loadReportingSettings(currentUser.id));
  }, [dispatch, currentUser?.id]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  const handleCategoryFilterChange = (filterCategoryId) => {
    setSelectedFilterCategoryIds((currentCategoryIds) =>
      currentCategoryIds.includes(filterCategoryId)
        ? currentCategoryIds.filter(
            (categoryItemId) => categoryItemId !== filterCategoryId,
          )
        : [...currentCategoryIds, filterCategoryId],
    );
  };

  return (
    <div className="page-container dashboard-page-container app-shell">
      <main className="welcome-card transaction-card main-workspace">
        <header className="dashboard-header app-topbar">
          <div className="dashboard-header-content">
            <span className="app-eyebrow">FinanceFlow</span>
            <h1 className="welcome-title">Finans Yönetimi</h1>
            <p className="page-description">
              Gelir, gider ve finansal durumunuzu tek ekrandan yönetin.
            </p>
            <p className="user-email">{currentUser?.email}</p>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="admin-button topbar-action-button"
              type="button"
              onClick={onNavigateDashboard}
            >
              Analizler
            </button>

            <button
              className="admin-button topbar-action-button secondary-topbar-button"
              type="button"
              onClick={onNavigateAdmin}
            >
              Yönetim
            </button>

            <button
              className="logout-button dashboard-logout-button topbar-logout-button"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Çıkış Yapılıyor..." : "Çıkış"}
            </button>
          </div>
        </header>

        <nav className="home-section-tabs" aria-label="Ana sayfa bölümleri">
          <button
            type="button"
            className={`home-section-tab ${activeHomeSection === "summary" ? "home-section-tab-active" : ""}`}
            onClick={() => setActiveHomeSection("summary")}
          >
            <span className="home-section-tab-title">Özet</span>
            <span className="home-section-tab-description">Genel finansal durum</span>
          </button>

          <button
            type="button"
            className={`home-section-tab ${activeHomeSection === "new-record" ? "home-section-tab-active" : ""}`}
            onClick={() => setActiveHomeSection("new-record")}
          >
            <span className="home-section-tab-title">Yeni Kayıt</span>
            <span className="home-section-tab-description">Gelir veya gider ekle</span>
          </button>

          <button
            type="button"
            className={`home-section-tab ${activeHomeSection === "records" ? "home-section-tab-active" : ""}`}
            onClick={() => setActiveHomeSection("records")}
          >
            <span className="home-section-tab-title">Kayıtlar & Arama</span>
            <span className="home-section-tab-description">Filtrele, ara ve incele</span>
          </button>
        </nav>

        {transactionSuccessMessage && (
          <div className="success-message floating-feedback-message">
            <span>{transactionSuccessMessage}</span>
            <button
              type="button"
              className="message-close-button"
              aria-label="Başarı mesajını kapat"
              onClick={() => dispatch(clearTransactionMessage())}
            >
              ×
            </button>
          </div>
        )}

        {transactionError && (
          <div className="error-message-panel floating-feedback-message" role="alert">
            <span>{transactionError}</span>
            <button
              type="button"
              className="message-close-button"
              aria-label="Hata mesajını kapat"
              onClick={() => dispatch(clearTransactionError())}
            >
              ×
            </button>
          </div>
        )}

        {activeHomeSection === "summary" && (
          <section className="home-section-content summary-workspace">
            <div className="workspace-heading">
              <div>
                <span className="workspace-kicker">Genel görünüm</span>
                <h2>Finansal Durumunuz</h2>
                <p>Aktif döneme ait temel tutarları ve dönem ayarlarını burada görebilirsiniz.</p>
              </div>
              <button
                type="button"
                className="workspace-primary-action"
                onClick={() => setActiveHomeSection("new-record")}
              >
                + Yeni Kayıt Ekle
              </button>
            </div>

            <FinanceSummary
              totalIncomeMinor={totalIncomeMinor}
              netExpenseMinor={netExpenseMinor}
              totalRefundMinor={totalRefundMinor}
              netBalanceMinor={netBalanceMinor}
              totalDebtMinor={totalDebtMinor}
              formatAmount={formatAmount}
            />

            <div className="settings-workspace-card">
              <ReportingPeriodSettings currentUser={currentUser} />
            </div>
          </section>
        )}

        {activeHomeSection === "new-record" && (
          <section className="home-section-content record-workspace">
            <div className="workspace-heading">
              <div>
                <span className="workspace-kicker">Kayıt oluştur</span>
                <h2>Yeni Finansal Kayıt</h2>
                <p>İşlem türünü seçin ve yalnızca ilgili bilgileri doldurun.</p>
              </div>
            </div>

            <TransactionForm
              getTodayDateValue={getTodayDateValue}
              convertInputAmountToMinor={convertInputAmountToMinor}
              formatAmount={formatAmount}
            />
          </section>
        )}

        {activeHomeSection === "records" && (
          <section className="home-section-content records-workspace">
            <div className="workspace-heading">
              <div>
                <span className="workspace-kicker">Kayıt yönetimi</span>
                <h2>Kayıtlar ve Arama</h2>
                <p>Kategoriye göre daraltın, içerikte arama yapın ve geçmiş işlemlerinizi inceleyin.</p>
              </div>
              <div className="record-count-pill">
                {filteredTransactions.length} kayıt
              </div>
            </div>

            <div className="records-tools-grid">
              <CategoryFilter
                selectedFilterCategoryIds={selectedFilterCategoryIds}
                setSelectedFilterCategoryIds={setSelectedFilterCategoryIds}
                includeDescendants={includeDescendants}
                setIncludeDescendants={setIncludeDescendants}
                activeCategories={activeCategories}
                handleCategoryFilterChange={handleCategoryFilterChange}
              />

              <GlobalSearch
                formatAmount={formatAmount}
                formatTransactionDate={formatTransactionDate}
              />
            </div>

            <TransactionTable
              transactionLoadStatus={transactionLoadStatus}
              transactions={transactions}
              filteredTransactions={filteredTransactions}
              selectedFilterCategoryIds={selectedFilterCategoryIds}
              getTransactionCategoryLabel={getTransactionCategoryLabel}
              formatAmount={formatAmount}
              formatTransactionDate={formatTransactionDate}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default Anasayfa;
