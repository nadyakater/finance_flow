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
    <div className="page-container dashboard-page-container">
      <div className="welcome-card transaction-card">
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <h1 className="welcome-title">Hoş Geldiniz</h1>

            <p className="page-description">
              FinanceFlow ana sayfasına giriş yapıldı.
            </p>

            <p className="user-email">{currentUser?.email}</p>
          </div>

          <div className="dashboard-header-actions">
            {/* =====================================================
    12.GÜN - 3.19
    Dashboard ve analizler ekranına geçiş yapılabilmesi
    için Dashboard butonu eklendi.
    ===================================================== */}

            <button
              className="admin-button"
              type="button"
              onClick={onNavigateDashboard}
            >
              Dashboard
            </button>

            <button
              className="admin-button"
              type="button"
              onClick={onNavigateAdmin}
            >
              Admin Paneli
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
            11.GÜN
            Finans Özeti ana sayfanın en üst bölümünde
            gösterilmeye devam eder.
            ===================================================== */}

        <FinanceSummary
          totalIncomeMinor={totalIncomeMinor}
          netExpenseMinor={netExpenseMinor}
          totalRefundMinor={totalRefundMinor}
          netBalanceMinor={netBalanceMinor}
          totalDebtMinor={totalDebtMinor}
          formatAmount={formatAmount}
        />

        {/* =====================================================
            11.GÜN
            Finansal dönem ayarları Finans Özeti'nin
            hemen altında tutulur.
            ===================================================== */}

        <ReportingPeriodSettings currentUser={currentUser} />

        {/* =====================================================
            11.GÜN
            3.17 kapsamındaki Düzenli Giderler ve Abonelikler
            bölümü Ana Sayfa'dan kaldırıldı.

            Bu yönetim alanı artık Admin Paneli içerisinde
            gösterilmektedir.
            ===================================================== */}

        <TransactionForm
          getTodayDateValue={getTodayDateValue}
          convertInputAmountToMinor={convertInputAmountToMinor}
          formatAmount={formatAmount}
        />

        {transactionSuccessMessage && (
          <div className="success-message">
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
          <div className="error-message-panel" role="alert">
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

        <CategoryFilter
          selectedFilterCategoryIds={selectedFilterCategoryIds}
          setSelectedFilterCategoryIds={setSelectedFilterCategoryIds}
          includeDescendants={includeDescendants}
          setIncludeDescendants={setIncludeDescendants}
          activeCategories={activeCategories}
          handleCategoryFilterChange={handleCategoryFilterChange}
        />

        {/* 12.GÜN - 3.21 - Kullanıcının tüm finansal işlemler üzerinde global arama yapabilmesi sağlandı. */}
        <GlobalSearch
          formatAmount={formatAmount}
          formatTransactionDate={formatTransactionDate}
        />

        <TransactionTable
          transactionLoadStatus={transactionLoadStatus}
          transactions={transactions}
          filteredTransactions={filteredTransactions}
          selectedFilterCategoryIds={selectedFilterCategoryIds}
          getTransactionCategoryLabel={getTransactionCategoryLabel}
          formatAmount={formatAmount}
          formatTransactionDate={formatTransactionDate}
        />
      </div>
    </div>
  );
}

export default Anasayfa;
