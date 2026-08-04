// =====================================================
// 3.GÜN - 6.GÜN
// Gelir, gider ve iade kayıtlarının tablo görünümü.
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
  return (
    <>
      <h2 className="section-title table-title">Gelir ve Gider Tablosu</h2>

      <div className="table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>İşlem Türü</th>
              <th>Kategori</th>
              <th>Miktar</th>
              <th>Firma / Şube</th>
              <th>İade Durumu</th>
              <th>İşlem Tarihi</th>
            </tr>
          </thead>

          <tbody>
            {transactionLoadStatus === "loading" &&
            transactions.length === 0 ? (
              <tr>
                <td className="empty-table-cell" colSpan="6">
                  Kayıtlar yükleniyor...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td className="empty-table-cell" colSpan="6">
                  {selectedFilterCategoryIds.length > 0
                    ? "Seçilen filtrelere uygun kayıt bulunmuyor."
                    : "Henüz kayıt bulunmuyor."}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.transactionType}</td>

                  <td>
                    {getTransactionCategoryLabel(transaction)}

                    {transaction.paymentMethod && (
                      <div>{transaction.paymentMethod}</div>
                    )}
                  </td>

                  <td>{formatAmount(transaction.amountMinor)} ₺</td>

                  <td>
                    {transaction.merchantName || "-"}

                    {transaction.branchName && (
                      <div>{transaction.branchName}</div>
                    )}
                  </td>

                  <td>
                    {transaction.transactionType === "Gider"
                      ? transaction.refundStatus === "full"
                        ? "Tam İade"
                        : transaction.refundStatus === "partial"
                          ? `Kısmi İade: ${formatAmount(
                              transaction.refundedMinor,
                            )} ₺`
                          : "İade Yok"
                      : transaction.transactionType === "İade"
                        ? "İade Kaydı"
                        : "-"}
                  </td>

                  <td>
                    {formatTransactionDate(
                      transaction.transactionDate,
                      transaction.createdAtUtc,
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default TransactionTable;