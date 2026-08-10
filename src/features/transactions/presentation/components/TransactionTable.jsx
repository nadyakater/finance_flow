import { useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";

import { removeTransaction } from "../../application/transactionThunks";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

function getTransactionMonthKey(transaction) {
  if (transaction.transactionDate) {
    return transaction.transactionDate.slice(0, 7);
  }

  if (transaction.createdAtUtc) {
    const date = new Date(transaction.createdAtUtc);

    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
    }
  }

  return "Tarihsiz";
}

function formatMonthLabel(monthKey) {
  if (monthKey === "Tarihsiz") {
    return "Tarihsiz Kayıtlar";
  }

  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

// =====================================================
// DÜZENLEME
// Aylık kayıt özetinde yalnızca gelir ve gider tutarları
// kullanılarak aylık net toplam hesaplanır.
// =====================================================
function calculateTransactionTotals(transactions) {
  return transactions.reduce(
    (totals, transaction) => {
      const amountMinor = Number(transaction.amountMinor ?? 0);

      if (transaction.transactionType === "Gelir") {
        totals.incomeMinor += amountMinor;
      }

      if (transaction.transactionType === "Gider") {
        totals.expenseMinor += amountMinor;
      }

      totals.netTotalMinor = totals.incomeMinor - totals.expenseMinor;

      return totals;
    },
    {
      incomeMinor: 0,

      expenseMinor: 0,

      netTotalMinor: 0,
    },
  );
}

// =====================================================
// DÜZENLEME
// Finansal kayıt tablosu yalnızca gelir ve gider kayıtlarını
// gösterecek şekilde sadeleştirildi.
//
// İade alanları kullanıcı arayüzünden kaldırıldı ancak eski
// Firestore kayıtları silinmedi.
//
// Kayıtlar aylara ayrıldı ve sayfanın en altında bütün
// kayıtların genel finansal toplamı gösterildi.
// =====================================================

function TransactionTable({
  transactionLoadStatus,
  transactions,
  filteredTransactions,
  selectedFilterCategoryIds,
  getTransactionCategoryLabel,
  formatAmount,
  formatTransactionDate,
}) {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  // DÜZENLEME - Eski iade kayıtları Firestore'da korunur ancak gelir ve gider tablosunda gösterilmez.
  const visibleTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (transaction) =>
          transaction.transactionType === "Gelir" ||
          transaction.transactionType === "Gider",
      ),
    [filteredTransactions],
  );

  const monthlyGroups = useMemo(() => {
    const groups = {};

    visibleTransactions.forEach((transaction) => {
      const monthKey = getTransactionMonthKey(transaction);

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }

      groups[monthKey].push(transaction);
    });

    return Object.entries(groups).sort(([firstMonthKey], [secondMonthKey]) =>
      secondMonthKey.localeCompare(firstMonthKey),
    );
  }, [visibleTransactions]);

  // DÜZENLEME - Ekranda gösterilen tüm gelir ve gider kayıtlarından genel toplam hesaplanır.
  const generalTotals = useMemo(
    () => calculateTransactionTotals(visibleTransactions),
    [visibleTransactions],
  );

  const handleArchive = async (transactionId) => {
    if (!window.confirm("Bu kayıt arşivlensin mi?")) {
      return;
    }

    if (!currentUser?.id) {
      return;
    }

    await dispatch(
      removeTransaction({
        userId: currentUser.id,

        transactionId,
      }),
    );
  };

  return (
    <>
      <h2 className="section-title table-title">Gelir ve Gider Kayıtları</h2>

      {transactionLoadStatus === "loading" ? (
        <p className="empty-message">Yükleniyor...</p>
      ) : visibleTransactions.length === 0 ? (
        <p className="empty-message">
          {selectedFilterCategoryIds.length > 0
            ? "Seçilen kategoriye ait gelir veya gider kaydı bulunamadı."
            : "Henüz gelir veya gider kaydı bulunmuyor."}
        </p>
      ) : (
        <>
          {monthlyGroups.map(([monthKey, monthTransactions]) => {
            const monthlyTotals = calculateTransactionTotals(monthTransactions);

            return (
              <section key={monthKey} className="category-management-section">
                <h3 className="archive-title">{formatMonthLabel(monthKey)}</h3>

                {/* DÜZENLEME - Her ay için yalnızca gelir, gider ve net toplam bilgileri gösterilir. */}
                <div className="category-form-grid">
                  <div className="category-action-panel">
                    <p className="selected-category-text">Aylık Gelir</p>

                    <strong>{formatAmount(monthlyTotals.incomeMinor)} ₺</strong>
                  </div>

                  <div className="category-action-panel">
                    <p className="selected-category-text">Aylık Gider</p>

                    <strong>
                      {formatAmount(monthlyTotals.expenseMinor)} ₺
                    </strong>
                  </div>

                  <div className="category-action-panel">
                    <p className="selected-category-text">Aylık Toplam</p>

                    <strong>
                      {formatAmount(monthlyTotals.netTotalMinor)} ₺
                    </strong>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>İşlem</th>

                        <th>Kategori / Açıklama</th>

                        <th>Tutar</th>

                        <th>Firma / Şube</th>

                        <th>Tarih</th>

                        <th>İşlem</th>
                      </tr>
                    </thead>

                    <tbody>
                      {monthTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{transaction.transactionType}</td>

                          <td>{getTransactionCategoryLabel(transaction)}</td>

                          <td>{formatAmount(transaction.amountMinor)} ₺</td>

                          <td>
                            {transaction.merchantName || "-"}

                            {transaction.branchName && (
                              <div className="table-secondary-text">
                                {transaction.branchName}
                              </div>
                            )}
                          </td>

                          <td>
                            {formatTransactionDate(
                              transaction.transactionDate,
                              transaction.createdAtUtc,
                            )}
                          </td>

                          <td>
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => handleArchive(transaction.id)}
                            >
                              Arşivle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {/* =====================================================
              DÜZENLEME
              Bütün aylarda gösterilen gelir ve gider kayıtlarının
              genel toplamı listenin en altında gösterilir.
              ===================================================== */}
          <section className="category-management-section">
            <h3 className="archive-title">Genel Toplam</h3>

            <div className="category-form-grid">
              <div className="category-action-panel">
                <p className="selected-category-text">Genel Gelir</p>

                <strong>{formatAmount(generalTotals.incomeMinor)} ₺</strong>
              </div>

              <div className="category-action-panel">
                <p className="selected-category-text">Genel Gider</p>

                <strong>{formatAmount(generalTotals.expenseMinor)} ₺</strong>
              </div>

              <div className="calculated-net-total">
                <span>Genel Toplam</span>

                <strong>{formatAmount(generalTotals.netTotalMinor)} ₺</strong>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default TransactionTable;
