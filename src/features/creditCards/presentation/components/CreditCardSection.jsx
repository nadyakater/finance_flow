import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  addCreditCard,
  changeCreditCardActiveStatus,
} from "../../application/creditCardThunks";

import {
  selectCreditCardError,
  selectCreditCardLoadStatus,
  selectCreditCardMutationStatus,
  selectCreditCards,
} from "../creditCardSelectors";

import { loadInstallmentPlans } from "../../../installments/application/installmentThunks";

import {
  selectCreditCardInstallmentSummaries,
  selectInstallmentError,
  selectInstallmentLoadStatus,
} from "../../../installments/presentation/installmentSelectors";

import {
  changeStatementDueDate,
  loadStatementPeriods,
  payStatement,
} from "../../../statements/application/statementThunks";

import {
  selectCreditCardPurchaseLoadSummaries,
  selectStatementError,
  selectStatementLoadStatus,
  selectStatementMutationStatus,
  selectStatementPeriodsByCreditCard,
} from "../../../statements/presentation/statementSelectors";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

import CreditCardAggregateAnalysis from "./CreditCardAggregateAnalysis";

// =====================================================
// 11.GÜN
// Kredi kartları bölümü düzenlendi.
//
// Kullanıcının ekranı daha rahat anlayabilmesi için
// önce kredi kartlarının kendi bilgileri gösterilir.
//
// Kartların detaylarından sonra bütün kredi kartlarını
// birlikte değerlendiren toplu yük analizi gösterilir.
// =====================================================

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("tr-TR");
}

function CreditCardSection() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const creditCards = useSelector(selectCreditCards);

  const creditCardLoadStatus = useSelector(selectCreditCardLoadStatus);

  const creditCardMutationStatus = useSelector(selectCreditCardMutationStatus);

  const creditCardError = useSelector(selectCreditCardError);

  const installmentSummaries = useSelector(
    selectCreditCardInstallmentSummaries,
  );

  const installmentLoadStatus = useSelector(selectInstallmentLoadStatus);

  const installmentError = useSelector(selectInstallmentError);

  const statementsByCreditCard = useSelector(
    selectStatementPeriodsByCreditCard,
  );

  const purchaseLoadSummaries = useSelector(
    selectCreditCardPurchaseLoadSummaries,
  );

  const statementLoadStatus = useSelector(selectStatementLoadStatus);

  const statementMutationStatus = useSelector(selectStatementMutationStatus);

  const statementError = useSelector(selectStatementError);

  const [name, setName] = useState("");

  const [issuer, setIssuer] = useState("");

  const [lastFourDigits, setLastFourDigits] = useState("");

  const [limit, setLimit] = useState("");

  const [creditCardFormError, setCreditCardFormError] = useState("");

  const [paymentAmounts, setPaymentAmounts] = useState({});

  const [manualDueDates, setManualDueDates] = useState({});

  const isMutating =
    creditCardMutationStatus === "loading" ||
    statementMutationStatus === "loading";

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    dispatch(loadInstallmentPlans(currentUser.id));

    dispatch(loadStatementPeriods(currentUser.id));
  }, [dispatch, currentUser?.id]);

  const resetForm = () => {
    setName("");
    setIssuer("");
    setLastFourDigits("");
    setLimit("");
    setCreditCardFormError("");
  };

  const handleAddCreditCard = async (event) => {
    event.preventDefault();

    setCreditCardFormError("");

    if (!currentUser?.id) {
      setCreditCardFormError(
        "Kredi kartı eklemek için kullanıcı oturumu bulunamadı.",
      );

      return;
    }

    if (!name.trim()) {
      setCreditCardFormError("Kart adı zorunludur.");

      return;
    }

    if (!issuer.trim()) {
      setCreditCardFormError("Banka veya kurum adı zorunludur.");

      return;
    }

    if (lastFourDigits && !/^\d{4}$/.test(lastFourDigits)) {
      setCreditCardFormError("Kartın son dört hanesi 4 rakamdan oluşmalıdır.");

      return;
    }

    const numericLimit = Number(limit);

    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      setCreditCardFormError("Kart limiti sıfırdan büyük olmalıdır.");

      return;
    }

    const result = await dispatch(
      addCreditCard({
        userId: currentUser.id,

        name,

        issuer,

        lastFourDigits,

        limit,

        // =====================================================
        // 11.GÜN
        // Kesim günü kullanıcıdan ayrıca istenmeden
        // sistem içerisinde teknik hesaplamalar için tutulur.
        // =====================================================

        statementDay: 31,

        // =====================================================
        // 11.GÜN
        // Son ödeme günü teknik hesaplamalarda kullanılmak
        // üzere varsayılan değer olarak tutulur.
        // =====================================================

        dueDay: 10,

        linkedPaymentAccountId: "",
      }),
    );

    if (addCreditCard.fulfilled.match(result)) {
      resetForm();
    }
  };

  const handleActiveStatusChange = async (creditCard) => {
    if (!currentUser?.id) {
      setCreditCardFormError(
        "Kredi kartı durumunu değiştirmek için kullanıcı oturumu bulunamadı.",
      );

      return;
    }

    setCreditCardFormError("");

    await dispatch(
      changeCreditCardActiveStatus({
        userId: currentUser.id,

        creditCardId: creditCard.id,

        isActive: !creditCard.isActive,
      }),
    );
  };

  const handleStatementPayment = async (statement) => {
    if (!currentUser?.id) {
      return;
    }

    const amount = paymentAmounts[statement.id] ?? "";

    const result = await dispatch(
      payStatement({
        userId: currentUser.id,

        statementPeriodId: statement.id,

        amount,
      }),
    );

    if (payStatement.fulfilled.match(result)) {
      setPaymentAmounts((currentValues) => ({
        ...currentValues,

        [statement.id]: "",
      }));
    }
  };

  const handleDueDateUpdate = async (statement) => {
    if (!currentUser?.id) {
      return;
    }

    const dueDate = manualDueDates[statement.id] ?? statement.dueDate;

    await dispatch(
      changeStatementDueDate({
        userId: currentUser.id,

        statementPeriodId: statement.id,

        dueDate,
      }),
    );
  };

  return (
    <section>
      <h2 className="section-title">Kredi Kartları</h2>

      {/* =====================================================
          11.GÜN
          Yeni kredi kartı ekleme formu.
          ===================================================== */}

      <form className="category-action-panel" onSubmit={handleAddCreditCard}>
        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="creditCardName">
              Kart Adı *
            </label>

            <input
              id="creditCardName"
              className="form-input"
              type="text"
              maxLength="100"
              placeholder="Örnek: Ana Kart"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="creditCardIssuer">
              Banka veya Kurum *
            </label>

            <input
              id="creditCardIssuer"
              className="form-input"
              type="text"
              maxLength="100"
              placeholder="Örnek: ABC Bankası"
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="creditCardLastFourDigits">
              Son Dört Hane
            </label>

            <input
              id="creditCardLastFourDigits"
              className="form-input"
              type="text"
              inputMode="numeric"
              maxLength="4"
              placeholder="1234"
              value={lastFourDigits}
              onChange={(event) =>
                setLastFourDigits(event.target.value.replace(/\D/g, ""))
              }
              disabled={isMutating}
            />
          </div>
        </div>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="creditCardLimit">
              Kart Limiti *
            </label>

            <input
              id="creditCardLimit"
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>
        </div>

        <button
          className="secondary-button"
          type="submit"
          disabled={isMutating}
        >
          {isMutating ? "Kart Ekleniyor..." : "Kredi Kartı Ekle"}
        </button>
      </form>

      {creditCardLoadStatus === "loading" && (
        <p className="empty-message">Kredi kartları yükleniyor...</p>
      )}

      {creditCardLoadStatus === "succeeded" && creditCards.length === 0 && (
        <p className="empty-message">Henüz kredi kartı eklenmedi.</p>
      )}

      {installmentLoadStatus === "loading" && (
        <p className="empty-message">Taksit bilgileri yükleniyor...</p>
      )}

      {statementLoadStatus === "loading" && (
        <p className="empty-message">Ekstreler yükleniyor...</p>
      )}

      {/* =====================================================
          11.GÜN
          Önce kullanıcının sahip olduğu kredi kartları ve
          bu kartlara ait ayrıntılı bilgiler gösterilir.

          Böylece kullanıcı toplu analize geçmeden önce
          hangi kartların hesaplamaya dahil olduğunu görebilir.
          ===================================================== */}

      {creditCards.length > 0 && (
        <div className="category-form-grid">
          {creditCards.map((creditCard) => {
            const installmentSummary = installmentSummaries[creditCard.id] ?? {
              currentMonthTotalMinor: 0,

              futureTotalMinor: 0,

              futureMonths: [],
            };

            const cardStatements = statementsByCreditCard[creditCard.id] ?? [];

            const purchaseLoadSummary = purchaseLoadSummaries[
              creditCard.id
            ] ?? {
              cycleStart: "",

              cycleEnd: "",

              dueDate: "",

              newSpendingMinor: 0,

              priorCommitmentBurdenMinor: 0,

              cashNeededByDueDateMinor: 0,

              futureCommittedInstallmentsMinor: 0,
            };

            return (
              <article key={creditCard.id} className="category-action-panel">
                <h3>{creditCard.name}</h3>

                <p>
                  <strong>Banka:</strong> {creditCard.issuer}
                </p>

                <p>
                  <strong>Kart:</strong>{" "}
                  {creditCard.lastFourDigits
                    ? `**** ${creditCard.lastFourDigits}`
                    : "Son dört hane girilmedi"}
                </p>

                <p>
                  <strong>Limit:</strong> {formatAmount(creditCard.limitMinor)}{" "}
                  ₺
                </p>

                <p>
                  <strong>Durum:</strong>{" "}
                  {creditCard.isActive ? "Aktif" : "Kapalı"}
                </p>

                {/* =====================================================
                      11.GÜN
                      Kartın bu dönem yaptığı yeni harcama ile
                      önceki dönemlerden gelen ödeme yükü ayrı tutulur.
                      ===================================================== */}

                <div className="installment-summary-panel">
                  <h4>Satın Alma ve Ödeme Yükü</h4>

                  {purchaseLoadSummary.cycleStart &&
                    purchaseLoadSummary.cycleEnd && (
                      <p>
                        <strong>Aktif Ekstre Dönemi:</strong>{" "}
                        {formatDate(purchaseLoadSummary.cycleStart)}
                        {" - "}
                        {formatDate(purchaseLoadSummary.cycleEnd)}
                      </p>
                    )}

                  <div className="installment-current-total">
                    <span>Bu Dönemde Yeni Harcama</span>

                    <strong>
                      {formatAmount(purchaseLoadSummary.newSpendingMinor)} ₺
                    </strong>
                  </div>

                  <p>
                    Bu tutar, mevcut kart döneminde yeni yapılan alışverişleri
                    gösterir.
                  </p>

                  <div className="installment-current-total">
                    <span>Önceki Dönemden Gelen Taksit Yükü</span>

                    <strong>
                      {formatAmount(
                        purchaseLoadSummary.priorCommitmentBurdenMinor,
                      )}{" "}
                      ₺
                    </strong>
                  </div>

                  <p>
                    Önceki aylarda yapılan alışverişlerin bu döneme düşen
                    taksitlerini gösterir.
                  </p>

                  <div className="installment-current-total">
                    <span>Son Ödeme Tarihine Kadar Gereken Para</span>

                    <strong>
                      {formatAmount(
                        purchaseLoadSummary.cashNeededByDueDateMinor,
                      )}{" "}
                      ₺
                    </strong>
                  </div>

                  <p>
                    Son ödeme tarihi:{" "}
                    <strong>{formatDate(purchaseLoadSummary.dueDate)}</strong>
                  </p>

                  <div className="installment-future-header">
                    <span>Gelecek Aylara Kalan Taksit Borcu</span>

                    <strong>
                      {formatAmount(
                        purchaseLoadSummary.futureCommittedInstallmentsMinor,
                      )}{" "}
                      ₺
                    </strong>
                  </div>
                </div>

                {/* =====================================================
                      11.GÜN
                      Kartın mevcut ve gelecek aylardaki
                      taksit yükleri gösterilir.
                      ===================================================== */}

                <div className="installment-summary-panel">
                  <div className="installment-current-total">
                    <span>Bu Ayki Taksit Toplamı</span>

                    <strong>
                      {formatAmount(installmentSummary.currentMonthTotalMinor)}{" "}
                      ₺
                    </strong>
                  </div>

                  <div className="installment-future-header">
                    <span>Gelecek Taksitler</span>

                    <strong>
                      {formatAmount(installmentSummary.futureTotalMinor)} ₺
                    </strong>
                  </div>

                  {installmentSummary.futureMonths.length > 0 ? (
                    <div className="installment-month-list">
                      {installmentSummary.futureMonths.map((month) => (
                        <div
                          key={month.monthKey}
                          className="installment-month-item"
                        >
                          <span>{month.monthLabel}</span>

                          <strong>{formatAmount(month.amountMinor)} ₺</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="installment-empty-text">
                      Gelecek aylara ait taksit bulunmuyor.
                    </p>
                  )}
                </div>

                {/* =====================================================
                      11.GÜN
                      Karta ait ekstre dönemleri ve kalan
                      borç bilgileri gösterilir.
                      ===================================================== */}

                <div className="category-action-panel">
                  <h4>Ekstreler</h4>

                  {cardStatements.length === 0 ? (
                    <p className="empty-message">
                      Henüz ekstre kaydı bulunmuyor.
                    </p>
                  ) : (
                    cardStatements.map((statement) => (
                      <div key={statement.id} className="category-action-panel">
                        <p>
                          <strong>Dönem:</strong>{" "}
                          {formatDate(statement.cycleStart)}
                          {" - "}
                          {formatDate(statement.cycleEnd)}
                        </p>

                        <p>
                          <strong>Durum:</strong>{" "}
                          {statement.status === "closed"
                            ? "Kapandı"
                            : "Tahmini"}
                        </p>

                        <p>
                          <strong>Ekstre:</strong>{" "}
                          {formatAmount(statement.statementAmountMinor)} ₺
                        </p>

                        <p>
                          <strong>Ödenen:</strong>{" "}
                          {formatAmount(statement.paidAmountMinor)} ₺
                        </p>

                        <p>
                          <strong>Kalan:</strong>{" "}
                          {formatAmount(statement.unpaidAmountMinor)} ₺
                        </p>

                        <p>
                          <strong>Son Ödeme:</strong>{" "}
                          {formatDate(statement.dueDate)}
                        </p>

                        <div>
                          <label className="form-label">
                            Son Ödeme Tarihini Düzelt
                          </label>

                          <input
                            className="form-input"
                            type="date"
                            value={
                              manualDueDates[statement.id] ?? statement.dueDate
                            }
                            onChange={(event) =>
                              setManualDueDates((currentValues) => ({
                                ...currentValues,

                                [statement.id]: event.target.value,
                              }))
                            }
                          />

                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => handleDueDateUpdate(statement)}
                            disabled={isMutating}
                          >
                            Tarihi Güncelle
                          </button>
                        </div>

                        {statement.unpaidAmountMinor > 0 && (
                          <div>
                            <label className="form-label">Ekstre Ödemesi</label>

                            <input
                              className="form-input"
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0,00"
                              value={paymentAmounts[statement.id] ?? ""}
                              onChange={(event) =>
                                setPaymentAmounts((currentValues) => ({
                                  ...currentValues,

                                  [statement.id]: event.target.value,
                                }))
                              }
                            />

                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleStatementPayment(statement)}
                              disabled={isMutating}
                            >
                              Ödemeyi Kaydet
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleActiveStatusChange(creditCard)}
                  disabled={isMutating}
                >
                  {creditCard.isActive ? "Kartı Kapat" : "Kartı Yeniden Aç"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================
          11.GÜN
          Kredi kartlarının kendi bilgileri gösterildikten sonra
          çoklu kredi kartı toplu yük analizi gösterilir.

          Böylece ekranın sıralaması:

          1. Kredi kartını ekle
          2. Kartlarını ve detaylarını incele
          3. Bütün kartların toplam finansal yükünü analiz et

          şeklinde daha anlaşılır hale getirildi.
          ===================================================== */}

      {creditCards.length > 0 && <CreditCardAggregateAnalysis />}

      {creditCardFormError && (
        <p className="form-error" role="alert">
          {creditCardFormError}
        </p>
      )}

      {creditCardError && (
        <p className="form-error" role="alert">
          {creditCardError}
        </p>
      )}

      {installmentError && (
        <p className="form-error" role="alert">
          {installmentError}
        </p>
      )}

      {statementError && (
        <p className="form-error" role="alert">
          {statementError}
        </p>
      )}
    </section>
  );
}

export default CreditCardSection;
