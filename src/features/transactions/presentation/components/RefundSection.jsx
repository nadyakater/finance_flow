import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { addRefundTransaction } from "../../application/transactionThunks";

import {
  selectTransactionSaveStatus,
  selectTransactions,
} from "../transactionSelectors";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

// =====================================================
// 6.GÜN
// Tam veya kısmi iade formunun presentation bileşeni.
//
// PDF mimarisine göre:
// - Yalnızca bu formu ilgilendiren geçici state burada tutulur.
// - Kalıcı işlem verileri Redux selectorlarından alınır.
// - Firebase'e doğrudan erişilmez.
// - Kayıt işlemi application katmanındaki thunk üzerinden yapılır.
// =====================================================

function RefundSection({
  getTodayDateValue,
  formatTransactionDate,
  getTransactionCategoryLabel,
  formatAmount,
}) {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);
  const transactions = useSelector(selectTransactions);
  const transactionSaveStatus = useSelector(selectTransactionSaveStatus);

  const [refundTransactionId, setRefundTransactionId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundDate, setRefundDate] = useState(getTodayDateValue());
  const [refundFormError, setRefundFormError] = useState("");

  const isSaving = transactionSaveStatus === "loading";

  const refundableTransactions = transactions.filter(
    (transaction) =>
      transaction.transactionType === "Gider" &&
      Number(transaction.refundedMinor ?? 0) <
        Number(transaction.amountMinor ?? 0),
  );

  const handleAddRefund = async (event) => {
    event.preventDefault();
    setRefundFormError("");

    if (!currentUser?.id || !refundTransactionId) {
      setRefundFormError("İade edilecek gider kaydını seçiniz.");
      return;
    }

    if (!refundAmount || Number(refundAmount) <= 0) {
      setRefundFormError("İade tutarı sıfırdan büyük olmalıdır.");
      return;
    }

    const result = await dispatch(
      addRefundTransaction({
        userId: currentUser.id,
        originalTransactionId: refundTransactionId,
        amount: refundAmount,
        reason: refundReason,
        paymentMethod: "İade",
        transactionDate: refundDate,
      }),
    );

    if (addRefundTransaction.fulfilled.match(result)) {
      setRefundTransactionId("");
      setRefundAmount("");
      setRefundReason("");
      setRefundDate(getTodayDateValue());
    }
  };

  return (
    <section className="category-management-section">
      <h2 className="section-title">Tam veya Kısmi İade</h2>

      <form className="category-form" onSubmit={handleAddRefund}>
        <div className="category-form-grid">
          <div>
            <label className="form-label" htmlFor="refundTransaction">
              Gider Kaydı
            </label>

            <select
              id="refundTransaction"
              className="form-input"
              value={refundTransactionId}
              onChange={(event) =>
                setRefundTransactionId(event.target.value)
              }
            >
              <option value="">Gider seçiniz</option>

              {refundableTransactions.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {formatTransactionDate(
                    transaction.transactionDate,
                    transaction.createdAtUtc,
                  )}{" "}
                  -{" "}
                  {transaction.merchantName ||
                    getTransactionCategoryLabel(transaction)}{" "}
                  - Kalan{" "}
                  {formatAmount(
                    Number(transaction.amountMinor ?? 0) -
                      Number(transaction.refundedMinor ?? 0),
                  )}{" "}
                  ₺
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="refundAmount">
              İade Tutarı
            </label>

            <input
              id="refundAmount"
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="refundDate">
              İade Tarihi
            </label>

            <input
              id="refundDate"
              className="form-input"
              type="date"
              value={refundDate}
              onChange={(event) => setRefundDate(event.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="refundReason">
              İade Nedeni
            </label>

            <input
              id="refundReason"
              className="form-input"
              type="text"
              placeholder="İsteğe bağlı"
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
            />
          </div>
        </div>

        <button
          className="add-button"
          type="submit"
          disabled={isSaving || refundableTransactions.length === 0}
        >
          İade Oluştur
        </button>
      </form>

      {refundFormError && (
        <p className="form-error">{refundFormError}</p>
      )}
    </section>
  );
}

export default RefundSection;