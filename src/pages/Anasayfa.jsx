import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

import { logoutUser } from "../features/auth/application/authThunks";

import {
  selectAuthStatus,
  selectCurrentUser,
} from "../features/auth/presentation/authSelectors";

import { loadCategories } from "../features/categories/application/categoryThunks";

import { loadCatalog } from "../features/catalog/application/catalogThunks";

import { loadCreditCards } from "../features/creditCards/application/creditCardThunks";

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

import TransactionTable from "../features/transactions/presentation/components/TransactionTable";

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

function Anasayfa() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const authStatus = useSelector(selectAuthStatus);

  const transactions = useSelector(selectTransactions);

  const transactionLoadStatus = useSelector(selectTransactionLoadStatus);

  const transactionError = useSelector(selectTransactionError);

  const transactionSuccessMessage = useSelector(
    selectTransactionSuccessMessage,
  );

  const totalIncomeMinor = useSelector(selectTotalIncomeMinor);

  const netExpenseMinor = useSelector(selectNetExpenseMinor);

  const totalRefundMinor = useSelector(selectTotalRefundMinor);

  const netBalanceMinor = useSelector(selectNetBalanceMinor);

  const isLoggingOut = authStatus === "loading";

  // 9.GÜN - Kullanıcı giriş yaptığında kredi kartı kayıtlarının yüklenmesi sağlandı.
  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    dispatch(loadTransactions(currentUser.id));

    dispatch(loadCategories(currentUser.id));

    dispatch(loadCatalog(currentUser.id));

    dispatch(loadCreditCards(currentUser.id));
  }, [dispatch, currentUser?.id]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  return (
    <div className="page-container dashboard-page-container">
      <div className="welcome-card transaction-card">
        {/* 10.GÜN - Kullanıcı bilgileri ve çıkış butonu sayfanın üst bölümünde birleştirildi. */}
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <h1 className="welcome-title">Hoş Geldiniz</h1>

            <p className="page-description">
              FinanceFlow ana sayfasına giriş yapıldı.
            </p>

            <p className="user-email">{currentUser?.email}</p>
          </div>

          <button
            className="logout-button dashboard-logout-button"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
          </button>
        </div>

        {/* 10.GÜN - Ana sayfa finans özeti, yeni kayıt ve kayıt listesi olacak şekilde sadeleştirildi. */}
        <FinanceSummary
          totalIncomeMinor={totalIncomeMinor}
          netExpenseMinor={netExpenseMinor}
          totalRefundMinor={totalRefundMinor}
          netBalanceMinor={netBalanceMinor}
          formatAmount={formatAmount}
        />

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

        <TransactionTable
          transactionLoadStatus={transactionLoadStatus}
          transactions={transactions}
          filteredTransactions={transactions}
          selectedFilterCategoryIds={[]}
          getTransactionCategoryLabel={getTransactionCategoryLabel}
          formatAmount={formatAmount}
          formatTransactionDate={formatTransactionDate}
        />
      </div>
    </div>
  );
}

export default Anasayfa;
