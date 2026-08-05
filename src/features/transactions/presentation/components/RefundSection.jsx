import {
  useMemo,
  useState,
} from "react";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  addRefundTransaction,
} from "../../application/transactionThunks";

import {
  selectTransactionRefundStatus,
  selectTransactions,
} from "../transactionSelectors";

import {
  selectCurrentUser,
} from "../../../auth/presentation/authSelectors";

function RefundSection({
  getTodayDateValue,
  formatTransactionDate,
  getTransactionCategoryLabel,
  formatAmount,
}) {
  const dispatch = useDispatch();

  const currentUser =
    useSelector(selectCurrentUser);

  const transactions =
    useSelector(selectTransactions);

  const refundSaveStatus =
    useSelector(
      selectTransactionRefundStatus,
    );

  const [
    refundTransactionId,
    setRefundTransactionId,
  ] = useState("");

  const [
    refundAmount,
    setRefundAmount,
  ] = useState("");

  const [
    refundReason,
    setRefundReason,
  ] = useState("");

  const [
    refundDate,
    setRefundDate,
  ] = useState(
    getTodayDateValue(),
  );

  const [
    refundFormError,
    setRefundFormError,
  ] = useState("");

  const isSaving =
    refundSaveStatus === "loading";

  const refundableTransactions =
    useMemo(
      () =>
        transactions.filter(
          (transaction) =>
            transaction.transactionType ===
              "Gider" &&
            !transaction.isDeleted &&
            Number(
              transaction.refundedMinor ??
                0,
            ) <
              Number(
                transaction.amountMinor ??
                  0,
              ),
        ),
      [transactions],
    );

  const selectedTransaction =
    useMemo(
      () =>
        refundableTransactions.find(
          (transaction) =>
            transaction.id ===
            refundTransactionId,
        ) ?? null,
      [
        refundableTransactions,
        refundTransactionId,
      ],
    );

  const remainingRefundMinor =
    selectedTransaction
      ? Math.max(
          Number(
            selectedTransaction.amountMinor ??
              0,
          ) -
            Number(
              selectedTransaction.refundedMinor ??
                0,
            ),
          0,
        )
      : 0;

  const handleTransactionChange =
    (event) => {
      setRefundTransactionId(
        event.target.value,
      );

      setRefundAmount("");

      setRefundFormError("");
    };

  const handleUseRemainingAmount =
    () => {
      if (
        remainingRefundMinor <= 0
      ) {
        return;
      }

      setRefundAmount(
        (
          remainingRefundMinor / 100
        ).toFixed(2),
      );
    };

  const handleAddRefund =
    async (event) => {
      event.preventDefault();

      setRefundFormError("");

      if (
        !currentUser?.id
      ) {
        setRefundFormError(
          "İade oluşturmak için kullanıcı oturumu bulunamadı.",
        );

        return;
      }

      if (
        !selectedTransaction
      ) {
        setRefundFormError(
          "İade edilecek gider kaydını seçiniz.",
        );

        return;
      }

      const refundAmountMinor =
        Math.round(
          Number(
            String(
              refundAmount,
            ).replace(",", "."),
          ) * 100,
        );

      if (
        !Number.isFinite(
          refundAmountMinor,
        ) ||
        refundAmountMinor <= 0
      ) {
        setRefundFormError(
          "İade tutarı sıfırdan büyük olmalıdır.",
        );

        return;
      }

      if (
        refundAmountMinor >
        remainingRefundMinor
      ) {
        setRefundFormError(
          `İade tutarı kalan ${formatAmount(
            remainingRefundMinor,
          )} ₺ tutarını aşamaz.`,
        );

        return;
      }

      if (!refundDate) {
        setRefundFormError(
          "İade tarihi zorunludur.",
        );

        return;
      }

      const result =
        await dispatch(
          addRefundTransaction({
            userId:
              currentUser.id,

            originalTransactionId:
              selectedTransaction.id,

            amount:
              refundAmount,

            refundedLines: [],

            reason:
              refundReason,

            paymentMethod:
              selectedTransaction.paymentMethod ||
              "İade",

            transactionDate:
              refundDate,
          }),
        );

      if (
        addRefundTransaction.fulfilled.match(
          result,
        )
      ) {
        setRefundTransactionId("");

        setRefundAmount("");

        setRefundReason("");

        setRefundDate(
          getTodayDateValue(),
        );

        return;
      }

      setRefundFormError(
        result.payload ??
          "İade kaydı oluşturulamadı.",
      );
    };

  return (
    <section className="category-management-section">
      <h2 className="section-title">
        Tam veya Kısmi İade
      </h2>

      <p className="empty-message">
        Daha önce eklenen bir giderin tamamını
        veya bir kısmını iade kaydı olarak
        oluşturabilirsiniz.
      </p>

      <form
        className="category-form"
        onSubmit={handleAddRefund}
      >
        <div className="category-form-grid">
          <div>
            <label
              className="form-label"
              htmlFor="refundTransaction"
            >
              Gider Kaydı *
            </label>

            <select
              id="refundTransaction"
              className="form-input"
              value={
                refundTransactionId
              }
              onChange={
                handleTransactionChange
              }
              disabled={
                isSaving ||
                refundableTransactions.length ===
                  0
              }
              required
            >
              <option value="">
                Gider seçiniz
              </option>

              {refundableTransactions.map(
                (transaction) => {
                  const remainingMinor =
                    Math.max(
                      Number(
                        transaction.amountMinor ??
                          0,
                      ) -
                        Number(
                          transaction.refundedMinor ??
                            0,
                        ),
                      0,
                    );

                  return (
                    <option
                      key={
                        transaction.id
                      }
                      value={
                        transaction.id
                      }
                    >
                      {formatTransactionDate(
                        transaction.transactionDate,
                        transaction.createdAtUtc,
                      )}
                      {" - "}
                      {transaction.merchantName ||
                        getTransactionCategoryLabel(
                          transaction,
                        )}
                      {" - Kalan "}
                      {formatAmount(
                        remainingMinor,
                      )}{" "}
                      ₺
                    </option>
                  );
                },
              )}
            </select>
          </div>

          <div>
            <label
              className="form-label"
              htmlFor="refundAmount"
            >
              İade Tutarı *
            </label>

            <div className="refund-amount-row">
              <input
                id="refundAmount"
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                value={refundAmount}
                onChange={(event) => {
                  setRefundAmount(
                    event.target.value,
                  );

                  setRefundFormError("");
                }}
                disabled={
                  isSaving ||
                  !selectedTransaction
                }
                required
              />

              <button
                className="secondary-button"
                type="button"
                onClick={
                  handleUseRemainingAmount
                }
                disabled={
                  isSaving ||
                  remainingRefundMinor <=
                    0
                }
              >
                Tamamını Kullan
              </button>
            </div>

            {selectedTransaction && (
              <p className="empty-message">
                İade edilebilir tutar:{" "}
                <strong>
                  {formatAmount(
                    remainingRefundMinor,
                  )}{" "}
                  ₺
                </strong>
              </p>
            )}
          </div>

          <div>
            <label
              className="form-label"
              htmlFor="refundDate"
            >
              İade Tarihi *
            </label>

            <input
              id="refundDate"
              className="form-input"
              type="date"
              value={refundDate}
              onChange={(event) =>
                setRefundDate(
                  event.target.value,
                )
              }
              disabled={isSaving}
              required
            />
          </div>

          <div>
            <label
              className="form-label"
              htmlFor="refundReason"
            >
              İade Nedeni
            </label>

            <input
              id="refundReason"
              className="form-input"
              type="text"
              maxLength="250"
              placeholder="İsteğe bağlı"
              value={refundReason}
              onChange={(event) =>
                setRefundReason(
                  event.target.value,
                )
              }
              disabled={isSaving}
            />
          </div>
        </div>

        <button
          className="add-button"
          type="submit"
          disabled={
            isSaving ||
            refundableTransactions.length ===
              0
          }
        >
          {isSaving
            ? "İade Oluşturuluyor..."
            : "İade Oluştur"}
        </button>
      </form>

      {refundableTransactions.length ===
        0 && (
        <p className="empty-message">
          İade edilebilecek aktif bir gider
          kaydı bulunmuyor.
        </p>
      )}

      {refundFormError && (
        <p
          className="form-error"
          role="alert"
        >
          {refundFormError}
        </p>
      )}
    </section>
  );
}

export default RefundSection;