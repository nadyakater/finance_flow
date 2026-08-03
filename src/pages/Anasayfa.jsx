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

import CategoryManager from "../components/CategoryManager";

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleString(
    "tr-TR",
  );
}

function Anasayfa() {
  const dispatch = useDispatch();

  const currentUser =
    useSelector(selectCurrentUser);

  const authStatus =
    useSelector(selectAuthStatus);

  const transactions =
    useSelector(selectTransactions);

  const transactionLoadStatus =
    useSelector(
      selectTransactionLoadStatus,
    );

  const transactionSaveStatus =
    useSelector(
      selectTransactionSaveStatus,
    );

  const transactionError =
    useSelector(selectTransactionError);

  const [
    transactionType,
    setTransactionType,
  ] = useState("Gelir");

  // 4.GÜN - Gelir ve gider kategorilerinin ortak state yapısı oluşturuldu.
  const [category, setCategory] =
    useState("Maaş");

  // 4.GÜN - Kullanıcının gireceği işlem miktarı için state eklendi.
  const [amount, setAmount] =
    useState("");

  // 4.GÜN - Gelir kategorileri tanımlandı.
  const incomeCategories = [
    "Maaş",
    "Freelance",
    "Kira",
    "Yatırım",
    "Diğer",
  ];

  // 4.GÜN - Gider kategorileri tanımlandı.
  const expenseCategories = [
    "Fatura",
    "Market",
    "Kira",
    "Ulaşım",
    "Sağlık",
    "Eğitim",
    "Diğer",
  ];

  const isLoggingOut =
    authStatus === "loading";

  const isSaving =
    transactionSaveStatus ===
    "loading";

  // 3.GÜN - Kullanıcının gelir ve gider kayıtları ana sayfa açıldığında getirildi.
  useEffect(() => {
    if (currentUser?.id) {
      dispatch(
        loadTransactions(
          currentUser.id,
        ),
      );
    }
  }, [
    dispatch,
    currentUser?.id,
  ]);

  // 1.GÜN - Çıkış butonu Redux thunk ile Firebase çıkış işlemine bağlandı.
  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  // 4.GÜN - İşlem türüne göre kategori değişimi güncellendi.
  const handleTransactionTypeChange = (
    event,
  ) => {
    const selectedType =
      event.target.value;

    setTransactionType(selectedType);

    if (selectedType === "Gider") {
      setCategory("Fatura");
    } else {
      setCategory("Maaş");
    }
  };

  // 3.GÜN - Seçilen gelir veya gider kaydı Ekle butonu ile kaydedildi.
  // 4.GÜN - Kategori ve miktar bilgileri kayıt işlemine eklendi.
  const handleAddTransaction = async (
    event,
  ) => {
    event.preventDefault();

    if (!currentUser?.id) {
      return;
    }

    const result =
      await dispatch(
        addTransaction({
          userId: currentUser.id,
          transactionType,
          category,
          amount,
        }),
      );

    if (
      addTransaction.fulfilled.match(
        result,
      )
    ) {
      setTransactionType("Gelir");
      setCategory("Maaş");
      setAmount("");
    }
  };

  return (
    <div className="page-container">
      <div className="welcome-card transaction-card">
        <h1 className="welcome-title">
          Hoş Geldiniz
        </h1>

        <p className="page-description">
          FinanceFlow ana sayfasına giriş
          yapıldı.
        </p>

        <p className="user-email">
          {currentUser?.email}
        </p>

        {/* ===================================================== */}
        {/* 5.GÜN - Kategori yönetim bileşeni ana sayfaya eklendi. */}
        {/* ===================================================== */}
        <CategoryManager />

        <form
          className="transaction-form"
          onSubmit={
            handleAddTransaction
          }
        >
          <h2 className="section-title">
            Yeni Kayıt
          </h2>

          <div className="form-row">
            <div>
              <label
                className="form-label"
                htmlFor="transactionType"
              >
                İşlem Türü
              </label>

              <select
                id="transactionType"
                className="form-input"
                value={transactionType}
                onChange={
                  handleTransactionTypeChange
                }
              >
                <option value="Gelir">
                  Gelir
                </option>

                <option value="Gider">
                  Gider
                </option>
              </select>
            </div>

            {/* 4.GÜN - Gelir ve gider kategorilerinin işlem türüne göre açılması sağlandı. */}
            <div>
              <label
                className="form-label"
                htmlFor="category"
              >
                {transactionType ===
                "Gelir"
                  ? "Gelir Türü"
                  : "Gider Türü"}
              </label>

              <select
                id="category"
                className="form-input"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
                  )
                }
              >
                {(transactionType ===
                "Gelir"
                  ? incomeCategories
                  : expenseCategories
                ).map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* 4.GÜN - Kullanıcının işlem miktarı girebilmesi için alan eklendi. */}
            <div>
              <label
                className="form-label"
                htmlFor="amount"
              >
                Miktar
              </label>

              <input
                id="amount"
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Miktar giriniz"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
              />
            </div>
          </div>

          <button
            className="add-button"
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? "Ekleniyor..."
              : "Ekle"}
          </button>
        </form>

        {transactionError && (
          <p className="form-error">
            {transactionError}
          </p>
        )}

        <h2 className="section-title table-title">
          Gelir ve Gider Tablosu
        </h2>

        <div className="table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>İşlem Türü</th>

                {/* 4.GÜN - Kategori bilgisi tabloya eklendi. */}
                <th>Kategori</th>

                {/* 4.GÜN - Miktar bilgisi tabloya eklendi. */}
                <th>Miktar</th>

                <th>Kayıt Tarihi</th>
              </tr>
            </thead>

            <tbody>
              {transactionLoadStatus ===
                "loading" &&
              transactions.length === 0 ? (
                <tr>
                  <td
                    className="empty-table-cell"
                    colSpan="4"
                  >
                    Kayıtlar yükleniyor...
                  </td>
                </tr>
              ) : transactions.length ===
                0 ? (
                <tr>
                  <td
                    className="empty-table-cell"
                    colSpan="4"
                  >
                    Henüz kayıt
                    bulunmuyor.
                  </td>
                </tr>
              ) : (
                transactions.map(
                  (transaction) => (
                    <tr
                      key={transaction.id}
                    >
                      <td>
                        {
                          transaction.transactionType
                        }
                      </td>

                      <td>
                        {transaction.category ||
                          "-"}
                      </td>

                      <td>
                        {transaction.amount ||
                          0}{" "}
                        ₺
                      </td>

                      <td>
                        {formatDate(
                          transaction.createdAtUtc,
                        )}
                      </td>
                    </tr>
                  ),
                )
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
          {isLoggingOut
            ? "Çıkış Yapılıyor..."
            : "Çıkış Yap"}
        </button>
      </div>
    </div>
  );
}

export default Anasayfa;