import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { logoutUser } from "../features/auth/application/authThunks";

import {
  selectAuthStatus,
  selectCurrentUser,
} from "../features/auth/presentation/authSelectors";

import {
  addTransaction,
  loadTransactions,
} from "../features/transactions/application/transactionThunks";

import {
  selectTransactionError,
  selectTransactionLoadStatus,
  selectTransactionSaveStatus,
  selectTransactions,
} from "../features/transactions/presentation/transactionSelectors";

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleString("tr-TR");
}

function Anasayfa() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const authStatus = useSelector(selectAuthStatus);

  const transactions = useSelector(selectTransactions);

  const transactionLoadStatus = useSelector(selectTransactionLoadStatus);

  const transactionSaveStatus = useSelector(selectTransactionSaveStatus);

  const transactionError = useSelector(selectTransactionError);

  const [transactionType, setTransactionType] = useState("Gelir");

  const [incomeType, setIncomeType] = useState("Maaş");

  const isLoggingOut = authStatus === "loading";

  const isSaving = transactionSaveStatus === "loading";

  // 3.GÜN - Kullanıcının gelir ve gider kayıtları ana sayfa açıldığında getirildi.
  useEffect(() => {
    if (currentUser?.id) {
      dispatch(loadTransactions(currentUser.id));
    }
  }, [dispatch, currentUser?.id]);

  // 1.GÜN - Çıkış butonu Redux thunk ile Firebase çıkış işlemine bağlandı.
  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  const handleTransactionTypeChange = (event) => {
    const selectedType = event.target.value;

    setTransactionType(selectedType);

    if (selectedType === "Gider") {
      setIncomeType("");
    } else {
      setIncomeType("Maaş");
    }
  };

  // 3.GÜN - Seçilen gelir veya gider kaydı Ekle butonu ile kaydedildi.
  const handleAddTransaction = async (event) => {
    event.preventDefault();

    if (!currentUser?.id) {
      return;
    }

    const result = await dispatch(
      addTransaction({
        userId: currentUser.id,
        transactionType,
        incomeType,
      }),
    );

    if (addTransaction.fulfilled.match(result)) {
      setTransactionType("Gelir");
      setIncomeType("Maaş");
    }
  };

  return (
    <div className="page-container">
      <div className="welcome-card transaction-card">
        <h1 className="welcome-title">Hoş Geldiniz</h1>

        <p className="page-description">
          FinanceFlow ana sayfasına giriş yapıldı.
        </p>

        <p className="user-email">{currentUser?.email}</p>

        <form className="transaction-form" onSubmit={handleAddTransaction}>
          <h2 className="section-title">Yeni Kayıt</h2>

          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="transactionType">
                İşlem Türü
              </label>

              <select
                id="transactionType"
                className="form-input"
                value={transactionType}
                onChange={handleTransactionTypeChange}
              >
                <option value="Gelir">Gelir</option>

                <option value="Gider">Gider</option>
              </select>
            </div>

            {transactionType === "Gelir" && (
              <div>
                <label className="form-label" htmlFor="incomeType">
                  Gelir Türü
                </label>

                <select
                  id="incomeType"
                  className="form-input"
                  value={incomeType}
                  onChange={(event) => setIncomeType(event.target.value)}
                >
                  <option value="Maaş">Maaş</option>

                  <option value="Freelance">Freelance</option>

                  <option value="Kira">Kira</option>

                  <option value="Diğer">Diğer</option>
                </select>
              </div>
            )}
          </div>

          <button className="add-button" type="submit" disabled={isSaving}>
            {isSaving ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>

        {transactionError && <p className="form-error">{transactionError}</p>}

        <h2 className="section-title table-title">Gelir ve Gider Tablosu</h2>

        <div className="table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>İşlem Türü</th>
                <th>Gelir Türü</th>
                <th>Kayıt Tarihi</th>
              </tr>
            </thead>

            <tbody>
              {transactionLoadStatus === "loading" &&
              transactions.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan="3">
                    Kayıtlar yükleniyor...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan="3">
                    Henüz kayıt bulunmuyor.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.transactionType}</td>

                    <td>{transaction.incomeType || "-"}</td>

                    <td>{formatDate(transaction.createdAtUtc)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          className="logout-button"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
        </button>
      </div>
    </div>
  );
}

export default Anasayfa;
