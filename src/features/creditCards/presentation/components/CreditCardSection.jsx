import { useState } from "react";

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

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

// =====================================================
// 9.GÜN
// Kredi kartı ekleme, listeleme ve aktiflik yönetimi
// Redux ve repository katmanları kullanılarak oluşturuldu.
// =====================================================

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  });
}

function getDueRuleLabel(dueRule) {
  if (dueRule?.type === "daysAfterStatement") {
    return `Kesim tarihinden ${dueRule.value} gün sonra`;
  }

  return `Her ayın ${dueRule?.value ?? "-"} günü`;
}

function CreditCardSection() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const creditCards = useSelector(selectCreditCards);

  const creditCardLoadStatus = useSelector(selectCreditCardLoadStatus);

  const creditCardMutationStatus = useSelector(selectCreditCardMutationStatus);

  const creditCardError = useSelector(selectCreditCardError);

  const [name, setName] = useState("");

  const [issuer, setIssuer] = useState("");

  const [lastFourDigits, setLastFourDigits] = useState("");

  const [limit, setLimit] = useState("");

  const [statementDay, setStatementDay] = useState("");

  const [dueRuleType, setDueRuleType] = useState("fixedDay");

  const [dueRuleValue, setDueRuleValue] = useState("");

  const [installmentSupport, setInstallmentSupport] = useState(true);

  const [creditCardFormError, setCreditCardFormError] = useState("");

  const isMutating = creditCardMutationStatus === "loading";

  const resetForm = () => {
    setName("");

    setIssuer("");

    setLastFourDigits("");

    setLimit("");

    setStatementDay("");

    setDueRuleType("fixedDay");

    setDueRuleValue("");

    setInstallmentSupport(true);

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

    const numericStatementDay = Number(statementDay);

    if (
      !Number.isInteger(numericStatementDay) ||
      numericStatementDay < 1 ||
      numericStatementDay > 31
    ) {
      setCreditCardFormError("Hesap kesim günü 1 ile 31 arasında olmalıdır.");

      return;
    }

    const numericDueRuleValue = Number(dueRuleValue);

    if (!Number.isInteger(numericDueRuleValue) || numericDueRuleValue < 1) {
      setCreditCardFormError(
        "Son ödeme tarihi kuralı için geçerli bir gün giriniz.",
      );

      return;
    }

    if (dueRuleType === "fixedDay" && numericDueRuleValue > 31) {
      setCreditCardFormError(
        "Sabit son ödeme günü 1 ile 31 arasında olmalıdır.",
      );

      return;
    }

    const result = await dispatch(
      addCreditCard({
        userId: currentUser.id,

        name,

        issuer,

        lastFourDigits,

        limit,

        statementDay,

        dueRuleType,

        dueRuleValue,

        linkedPaymentAccountId: "",

        installmentSupport,
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

  return (
    <section className="category-management-section">
      <h2 className="section-title">Kredi Kartları</h2>

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

          <div>
            <label className="form-label" htmlFor="creditCardStatementDay">
              Hesap Kesim Günü *
            </label>

            <input
              id="creditCardStatementDay"
              className="form-input"
              type="number"
              min="1"
              max="31"
              step="1"
              placeholder="25"
              value={statementDay}
              onChange={(event) => setStatementDay(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="creditCardDueRuleType">
              Son Ödeme Kuralı *
            </label>

            <select
              id="creditCardDueRuleType"
              className="form-input"
              value={dueRuleType}
              onChange={(event) => {
                setDueRuleType(event.target.value);

                setDueRuleValue("");
              }}
              disabled={isMutating}
              required
            >
              <option value="fixedDay">Her Ay Sabit Gün</option>

              <option value="daysAfterStatement">
                Kesimden Belirli Gün Sonra
              </option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="creditCardDueRuleValue">
              {dueRuleType === "fixedDay"
                ? "Son Ödeme Günü *"
                : "Kesimden Sonraki Gün Sayısı *"}
            </label>

            <input
              id="creditCardDueRuleValue"
              className="form-input"
              type="number"
              min="1"
              max={dueRuleType === "fixedDay" ? "31" : "60"}
              step="1"
              placeholder={dueRuleType === "fixedDay" ? "5" : "10"}
              value={dueRuleValue}
              onChange={(event) => setDueRuleValue(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>

          <div>
            <label
              className="form-label"
              htmlFor="creditCardInstallmentSupport"
            >
              Taksit Desteği
            </label>

            <select
              id="creditCardInstallmentSupport"
              className="form-input"
              value={installmentSupport ? "enabled" : "disabled"}
              onChange={(event) =>
                setInstallmentSupport(event.target.value === "enabled")
              }
              disabled={isMutating}
            >
              <option value="enabled">Açık</option>

              <option value="disabled">Kapalı</option>
            </select>
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

      {creditCards.length > 0 && (
        <div className="category-form-grid">
          {creditCards.map((creditCard) => (
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
                <strong>Limit:</strong> {formatAmount(creditCard.limitMinor)} ₺
              </p>

              <p>
                <strong>Hesap Kesim Günü:</strong> {creditCard.statementDay}
              </p>

              <p>
                <strong>Son Ödeme:</strong>{" "}
                {getDueRuleLabel(creditCard.dueRule)}
              </p>

              <p>
                <strong>Taksit:</strong>{" "}
                {creditCard.installmentSupport ? "Açık" : "Kapalı"}
              </p>

              <p>
                <strong>Durum:</strong>{" "}
                {creditCard.isActive ? "Aktif" : "Kapalı"}
              </p>

              <button
                className="secondary-button"
                type="button"
                onClick={() => handleActiveStatusChange(creditCard)}
                disabled={isMutating}
              >
                {creditCard.isActive ? "Kartı Kapat" : "Kartı Yeniden Aç"}
              </button>
            </article>
          ))}
        </div>
      )}

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
    </section>
  );
}

export default CreditCardSection;
