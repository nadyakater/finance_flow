import { useDispatch } from "react-redux";

import { removeTransaction } from "../../application/transactionThunks";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

import { useSelector } from "react-redux";

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

  const currentUser = useSelector(
    selectCurrentUser,
  );

  const handleArchive = async (
    transactionId,
  ) => {
    if (
      !window.confirm(
        "Bu kayıt arşivlensin mi?",
      )
    ) {
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
      <h2 className="section-title table-title">
        Gelir, Gider ve İade
        Kayıtları
      </h2>

      <div className="table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>İşlem</th>

              <th>
                Kategori / Açıklama
              </th>

              <th>Tutar</th>

              <th>
                Firma / Şube
              </th>

              <th>
                Satırlar /
                İndirim
              </th>

              <th>
                İade Durumu
              </th>

              <th>Tarih</th>

              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {transactionLoadStatus ===
            "loading" ? (
              <tr>
                <td
                  className="empty-table-cell"
                  colSpan="8"
                >
                  Yükleniyor...
                </td>
              </tr>
            ) : filteredTransactions.length ===
              0 ? (
              <tr>
                <td
                  className="empty-table-cell"
                  colSpan="8"
                >
                  {selectedFilterCategoryIds.length >
                  0
                    ? "Seçilen kategoriye ait kayıt bulunamadı."
                    : "Henüz kayıt bulunmuyor."}
                </td>
              </tr>
            ) : (
              filteredTransactions.map(
                (
                  transaction,
                ) => (
                  <tr
                    key={
                      transaction.id
                    }
                  >
                    <td>
                      {
                        transaction.transactionType
                      }
                    </td>

                    <td>
                      {getTransactionCategoryLabel(
                        transaction,
                      )}
                    </td>

                    <td>
                      {formatAmount(
                        transaction.amountMinor,
                      )}{" "}
                      ₺
                    </td>

                    <td>
                      {transaction.merchantName ||
                        "-"}

                      {transaction.branchName && (
                        <div className="table-secondary-text">
                          {
                            transaction.branchName
                          }
                        </div>
                      )}
                    </td>

                    <td>
                      {transaction.lines
                        ?.length ??
                        0}{" "}
                      satır

                      <div className="table-secondary-text">
                        İndirim:{" "}
                        {formatAmount(
                          transaction.transactionDiscountMinor +
                            transaction.lineDiscountTotalMinor,
                        )}{" "}
                        ₺
                      </div>
                    </td>

                    <td>
                      {transaction.refundStatus ===
                      "full"
                        ? "Tam İade"
                        : transaction.refundStatus ===
                          "partial"
                        ? "Kısmi İade"
                        : "İade Yok"}
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
                        onClick={() =>
                          handleArchive(
                            transaction.id,
                          )
                        }
                      >
                        Arşivle
                      </button>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default TransactionTable;