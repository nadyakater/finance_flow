import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  addRecurringRule,
  changeRecurringActiveStatus,
  changeRecurringAmount,
  completeForecastPayment,
  generateNextForecast,
  loadForecastsForRule,
  loadRecurringRules,
} from "../../application/recurringThunks";

import {
  selectForecastAccuracyAnalysis,
  selectForecastsByRuleId,
  selectNextForecastByRule,
  selectOverdueForecastTotalMinor,
  selectOverdueForecasts,
  selectRecurringError,
  selectRecurringLoadStatus,
  selectRecurringMutationStatus,
  selectRecurringRules,
  selectUpcomingForecastTotalMinor,
  selectUpcomingForecasts,
} from "../recurringSelectors";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

// =====================================================
// 11.GÜN
// Kuruş cinsinden tutarları TL biçiminde göstermek için
// yardımcı fonksiyon kullanılır.
// =====================================================

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// =====================================================
// 11.GÜN
// YYYY-MM-DD biçimindeki tarihleri kullanıcıya daha
// anlaşılır Türkçe tarih biçiminde gösterir.
// =====================================================

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("tr-TR");
}

// =====================================================
// 11.GÜN
// Kullanıcının TL olarak girdiği tutarı kuruşa çevirir.
// =====================================================

function convertAmountToMinor(amount) {
  const normalizedAmount = String(amount ?? "").replace(",", ".");

  const numericAmount = Number(normalizedAmount);

  if (!Number.isFinite(numericAmount)) {
    return 0;
  }

  return Math.round(numericAmount * 100);
}

// =====================================================
// 11.GÜN - Düzenli gider ve abonelik ekranı
//
// Kullanıcı:
// - düzenli gider oluşturabilir,
// - tahmini gelecek ödeme oluşturabilir,
// - gerçek tutarı girerek ödemeyi kapatabilir,
// - tutar değişikliğini geçmişi bozmadan kaydedebilir,
// - yaklaşan ve geciken ödemeleri görebilir.
// =====================================================

function RecurringExpenseSection() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const recurringRules = useSelector(selectRecurringRules);

  const recurringLoadStatus = useSelector(selectRecurringLoadStatus);

  const recurringMutationStatus = useSelector(selectRecurringMutationStatus);

  const recurringError = useSelector(selectRecurringError);

  const forecastsByRuleId = useSelector(selectForecastsByRuleId);

  const nextForecastByRule = useSelector(selectNextForecastByRule);

  const upcomingForecasts = useSelector(selectUpcomingForecasts);

  const overdueForecasts = useSelector(selectOverdueForecasts);

  const upcomingForecastTotalMinor = useSelector(
    selectUpcomingForecastTotalMinor,
  );

  const overdueForecastTotalMinor = useSelector(
    selectOverdueForecastTotalMinor,
  );

  const forecastAccuracyAnalysis = useSelector(selectForecastAccuracyAnalysis);

  // =====================================================
  // 11.GÜN
  // Yeni düzenli gider form alanları.
  // =====================================================

  const [name, setName] = useState("");

  const [recurringDay, setRecurringDay] = useState("1");

  const [estimatedAmount, setEstimatedAmount] = useState("");

  const [categoryId, setCategoryId] = useState("");

  const [categoryPath, setCategoryPath] = useState("");

  const [formError, setFormError] = useState("");

  // =====================================================
  // 11.GÜN
  // Her forecast için kullanıcının gireceği gerçek tutarı
  // ayrı ayrı tutar.
  // =====================================================

  const [actualAmounts, setActualAmounts] = useState({});

  // =====================================================
  // 11.GÜN
  // Her recurring rule için yeni fiyat alanını ayrı tutar.
  // =====================================================

  const [updatedAmounts, setUpdatedAmounts] = useState({});

  const isMutating = recurringMutationStatus === "loading";

  // =====================================================
  // 11.GÜN
  // Kullanıcı giriş yaptığında düzenli gider kuralları
  // Firestore'dan yüklenir.
  // =====================================================

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    dispatch(loadRecurringRules(currentUser.id));
  }, [dispatch, currentUser?.id]);

  // =====================================================
  // 11.GÜN
  // Recurring rule listesi geldikten sonra her kurala
  // ait forecast kayıtları ayrıca yüklenir.
  // =====================================================

  useEffect(() => {
    if (!currentUser?.id || recurringRules.length === 0) {
      return;
    }

    recurringRules.forEach((recurringRule) => {
      dispatch(
        loadForecastsForRule({
          userId: currentUser.id,

          recurringRuleId: recurringRule.id,
        }),
      );
    });
  }, [dispatch, currentUser?.id, recurringRules]);

  const handleAddRecurringRule = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!currentUser?.id) {
      setFormError("Düzenli gider eklemek için kullanıcı oturumu bulunamadı.");

      return;
    }

    if (!name.trim()) {
      setFormError("Düzenli gider adı zorunludur.");

      return;
    }

    const numericDay = Number(recurringDay);

    if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 31) {
      setFormError("Ödeme günü 1 ile 31 arasında olmalıdır.");

      return;
    }

    const estimatedAmountMinor = convertAmountToMinor(estimatedAmount);

    if (estimatedAmountMinor <= 0) {
      setFormError("Tahmini tutar sıfırdan büyük olmalıdır.");

      return;
    }

    const result = await dispatch(
      addRecurringRule({
        userId: currentUser.id,

        name,

        categoryId,

        categoryPath,

        recurringDay: numericDay,

        estimatedAmountMinor,
      }),
    );

    if (addRecurringRule.fulfilled.match(result)) {
      setName("");
      setRecurringDay("1");
      setEstimatedAmount("");
      setCategoryId("");
      setCategoryPath("");
    }
  };

  // =====================================================
  // 11.GÜN
  // Düzenli gider için sıradaki forecast kaydını oluşturur.
  //
  // Burada transaction oluşturulmaz.
  // =====================================================

  const handleGenerateForecast = async (recurringRule) => {
    if (!currentUser?.id) {
      return;
    }

    await dispatch(
      generateNextForecast({
        userId: currentUser.id,

        recurringRule,
      }),
    );
  };

  // =====================================================
  // 11.GÜN
  // Forecast kaydını gerçek ödeme bilgisiyle kapatır.
  //
  // estimatedAmountMinor korunur,
  // actualAmountMinor ayrıca yazılır.
  // =====================================================

  const handleCompletePayment = async (recurringRule, forecast) => {
    if (!currentUser?.id) {
      return;
    }

    const actualAmount = actualAmounts[forecast.id] ?? "";

    const actualAmountMinor = convertAmountToMinor(actualAmount);

    if (actualAmountMinor <= 0) {
      setFormError("Gerçek ödeme tutarı sıfırdan büyük olmalıdır.");

      return;
    }

    await dispatch(
      completeForecastPayment({
        userId: currentUser.id,

        recurringRuleId: recurringRule.id,

        forecastId: forecast.id,

        actualAmountMinor,

        transactionId: "",

        paidAt: new Date().toISOString().slice(0, 10),
      }),
    );

    setActualAmounts((currentValues) => ({
      ...currentValues,

      [forecast.id]: "",
    }));
  };

  // =====================================================
  // 11.GÜN
  // Düzenli giderin tahmini tutarını değiştirir.
  //
  // Eski fiyat silinmez, amountHistory içinde korunur.
  // =====================================================

  const handleAmountUpdate = async (recurringRule) => {
    if (!currentUser?.id) {
      return;
    }

    const newAmount = updatedAmounts[recurringRule.id] ?? "";

    const newAmountMinor = convertAmountToMinor(newAmount);

    if (newAmountMinor <= 0) {
      setFormError("Yeni tahmini tutar sıfırdan büyük olmalıdır.");

      return;
    }

    await dispatch(
      changeRecurringAmount({
        userId: currentUser.id,

        recurringRuleId: recurringRule.id,

        newAmountMinor,

        effectiveFrom: new Date().toISOString().slice(0, 10),
      }),
    );

    setUpdatedAmounts((currentValues) => ({
      ...currentValues,

      [recurringRule.id]: "",
    }));
  };

  const handleActiveStatusChange = async (recurringRule) => {
    if (!currentUser?.id) {
      return;
    }

    await dispatch(
      changeRecurringActiveStatus({
        userId: currentUser.id,

        recurringRuleId: recurringRule.id,

        isActive: !recurringRule.isActive,
      }),
    );
  };

  return (
    <section>
      <h2 className="section-title">Düzenli Giderler ve Abonelikler</h2>

      {/* =====================================================
          11.GÜN
          Yeni recurring rule oluşturma formu.
          ===================================================== */}

      <form className="category-action-panel" onSubmit={handleAddRecurringRule}>
        <h3>Yeni Düzenli Gider</h3>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="recurringName">
              Gider / Abonelik Adı *
            </label>

            <input
              id="recurringName"
              className="form-input"
              type="text"
              placeholder="Örnek: İnternet"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="recurringDay">
              Ödeme Günü *
            </label>

            <input
              id="recurringDay"
              className="form-input"
              type="number"
              min="1"
              max="31"
              step="1"
              value={recurringDay}
              onChange={(event) => setRecurringDay(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="recurringEstimatedAmount">
              Tahmini Tutar *
            </label>

            <input
              id="recurringEstimatedAmount"
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={estimatedAmount}
              onChange={(event) => setEstimatedAmount(event.target.value)}
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
          {isMutating ? "Kaydediliyor..." : "Düzenli Gider Ekle"}
        </button>
      </form>

      {/* =====================================================
          11.GÜN
          Yaklaşan ve geciken ödeme özetleri.
          ===================================================== */}

      <div className="category-form-grid">
        <div className="category-action-panel">
          <p className="selected-category-text">Yaklaşan Ödeme Toplamı</p>

          <strong>{formatAmount(upcomingForecastTotalMinor)} ₺</strong>
        </div>

        <div className="category-action-panel">
          <p className="selected-category-text">Geciken Ödeme Toplamı</p>

          <strong>{formatAmount(overdueForecastTotalMinor)} ₺</strong>
        </div>
      </div>

      {/* =====================================================
          11.GÜN
          Kullanıcının düzenli gider kuralları listelenir.
          ===================================================== */}

      {recurringLoadStatus === "loading" && (
        <p className="empty-message">Düzenli giderler yükleniyor...</p>
      )}

      {recurringLoadStatus === "succeeded" && recurringRules.length === 0 && (
        <p className="empty-message">
          Henüz düzenli gider veya abonelik eklenmedi.
        </p>
      )}

      {recurringRules.length > 0 && (
        <div className="category-form-grid">
          {recurringRules.map((recurringRule) => {
            const forecasts = forecastsByRuleId[recurringRule.id] ?? [];

            const nextForecast = nextForecastByRule[recurringRule.id];

            return (
              <article key={recurringRule.id} className="category-action-panel">
                <h3>{recurringRule.name}</h3>

                <p>
                  <strong>Durum:</strong>{" "}
                  {recurringRule.isActive ? "Aktif" : "Pasif"}
                </p>

                <p>
                  <strong>Ödeme Günü:</strong> Her ayın{" "}
                  {recurringRule.recurringDay}. günü
                </p>

                <p>
                  <strong>Güncel Tahmini Tutar:</strong>{" "}
                  {formatAmount(recurringRule.estimatedAmountMinor)} ₺
                </p>

                {/* =====================================================
                      11.GÜN
                      Bir sonraki forecast bilgisi gösterilir.
                      ===================================================== */}

                <div className="installment-summary-panel">
                  <h4>Sonraki Ödeme</h4>

                  {nextForecast ? (
                    <>
                      <p>
                        <strong>Tarih:</strong>{" "}
                        {formatDate(nextForecast.dueDate)}
                      </p>

                      <p>
                        <strong>Tahmini Tutar:</strong>{" "}
                        {formatAmount(nextForecast.estimatedAmountMinor)} ₺
                      </p>
                    </>
                  ) : (
                    <p className="empty-message">
                      Henüz forecast oluşturulmadı.
                    </p>
                  )}

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleGenerateForecast(recurringRule)}
                    disabled={isMutating || !recurringRule.isActive}
                  >
                    Sıradaki Tahmini Ödemeyi Oluştur
                  </button>
                </div>

                {/* =====================================================
                      11.GÜN
                      Düzenli giderin tahmini tutarı değiştirilebilir.
                      Eski tutar geçmişte korunur.
                      ===================================================== */}

                <div className="installment-summary-panel">
                  <h4>Tutar Güncelle</h4>

                  <input
                    className="form-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Yeni tutar"
                    value={updatedAmounts[recurringRule.id] ?? ""}
                    onChange={(event) =>
                      setUpdatedAmounts((currentValues) => ({
                        ...currentValues,

                        [recurringRule.id]: event.target.value,
                      }))
                    }
                  />

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleAmountUpdate(recurringRule)}
                    disabled={isMutating}
                  >
                    Tutarı Güncelle
                  </button>

                  {/* =====================================================
                        11.GÜN
                        Abonelik fiyat geçmişi kullanıcıya gösterilir.
                        ===================================================== */}

                  {Array.isArray(recurringRule.amountHistory) &&
                    recurringRule.amountHistory.length > 0 && (
                      <div className="installment-month-list">
                        {recurringRule.amountHistory.map(
                          (historyItem, index) => (
                            <div
                              key={`${historyItem.effectiveFrom}-${index}`}
                              className="installment-month-item"
                            >
                              <span>
                                {formatDate(historyItem.effectiveFrom)}
                              </span>

                              <strong>
                                {formatAmount(historyItem.amountMinor)} ₺
                              </strong>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                </div>

                {/* =====================================================
                      11.GÜN
                      Forecast kayıtları listelenir.
                      ===================================================== */}

                <div className="installment-summary-panel">
                  <h4>Ödeme Tahminleri</h4>

                  {forecasts.length === 0 ? (
                    <p className="empty-message">Forecast kaydı bulunmuyor.</p>
                  ) : (
                    forecasts.map((forecast) => (
                      <div key={forecast.id} className="category-action-panel">
                        <p>
                          <strong>Son Ödeme:</strong>{" "}
                          {formatDate(forecast.dueDate)}
                        </p>

                        <p>
                          <strong>Tahmin:</strong>{" "}
                          {formatAmount(forecast.estimatedAmountMinor)} ₺
                        </p>

                        <p>
                          <strong>Durum:</strong>{" "}
                          {forecast.status === "paid" ? "Ödendi" : "Bekleniyor"}
                        </p>

                        {forecast.status === "paid" && (
                          <>
                            <p>
                              <strong>Gerçek Tutar:</strong>{" "}
                              {formatAmount(forecast.actualAmountMinor)} ₺
                            </p>

                            <p>
                              <strong>Ödeme Tarihi:</strong>{" "}
                              {formatDate(forecast.paidAt)}
                            </p>
                          </>
                        )}

                        {/* =====================================================
                                11.GÜN
                                Henüz ödenmemiş forecast için gerçek ödeme
                                tutarı girilebilir.
                                ===================================================== */}

                        {forecast.status !== "paid" && (
                          <div>
                            <label className="form-label">
                              Gerçek Ödeme Tutarı
                            </label>

                            <input
                              className="form-input"
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="Gerçek tutar"
                              value={actualAmounts[forecast.id] ?? ""}
                              onChange={(event) =>
                                setActualAmounts((currentValues) => ({
                                  ...currentValues,

                                  [forecast.id]: event.target.value,
                                }))
                              }
                            />

                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() =>
                                handleCompletePayment(recurringRule, forecast)
                              }
                              disabled={isMutating}
                            >
                              Ödemeyi Tamamla
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
                  onClick={() => handleActiveStatusChange(recurringRule)}
                  disabled={isMutating}
                >
                  {recurringRule.isActive
                    ? "Düzenli Gideri Pasif Yap"
                    : "Düzenli Gideri Aktif Yap"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================
          11.GÜN
          Yaklaşan ödemeler tek listede gösterilir.
          Ödenmiş faturalar burada tekrar görünmez.
          ===================================================== */}

      <div className="category-action-panel">
        <h3>Yaklaşan Ödemeler</h3>

        {upcomingForecasts.length === 0 ? (
          <p className="empty-message">Yaklaşan ödeme bulunmuyor.</p>
        ) : (
          <div className="installment-month-list">
            {upcomingForecasts.map((forecast) => {
              const matchedRule = recurringRules.find(
                (recurringRule) =>
                  recurringRule.id === forecast.recurringRuleId,
              );

              return (
                <div key={forecast.id} className="installment-month-item">
                  <span>
                    {matchedRule?.name ?? "Düzenli Gider"}
                    {" - "}
                    {formatDate(forecast.dueDate)}
                  </span>

                  <strong>
                    {formatAmount(forecast.estimatedAmountMinor)} ₺
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
          11.GÜN
          Geciken ödeme kayıtları ayrıca gösterilir.
          ===================================================== */}

      <div className="category-action-panel">
        <h3>Geciken Ödemeler</h3>

        {overdueForecasts.length === 0 ? (
          <p className="empty-message">Geciken ödeme bulunmuyor.</p>
        ) : (
          <div className="installment-month-list">
            {overdueForecasts.map((forecast) => (
              <div key={forecast.id} className="installment-month-item">
                <span>{formatDate(forecast.dueDate)}</span>

                <strong>{formatAmount(forecast.estimatedAmountMinor)} ₺</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          11.GÜN
          Ödenmiş kayıtların tahmin-gerçek farkı analiz edilir.
          Eşleşen kural adı (gider/abonelik adı) en üste başlık olarak eklenmiştir.
          ===================================================== */}

      <div className="category-action-panel">
        <h3>Tahmin / Gerçek Tutar Analizi</h3>

        {forecastAccuracyAnalysis.length === 0 ? (
          <p className="empty-message">
            Henüz analiz edilecek ödenmiş kayıt bulunmuyor.
          </p>
        ) : (
          <div className="installment-month-list">
            {forecastAccuracyAnalysis.map((forecast) => {
              const matchedRule = recurringRules.find(
                (recurringRule) =>
                  recurringRule.id === forecast.recurringRuleId,
              );

              return (
                <div key={forecast.id} className="category-action-panel">
                  <h4 style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>
                    {matchedRule?.name ?? "Düzenli Gider"}
                  </h4>

                  <p>
                    Tahmin:{" "}
                    <strong>
                      {formatAmount(forecast.estimatedAmountMinor)} ₺
                    </strong>
                  </p>

                  <p>
                    Gerçek:{" "}
                    <strong>{formatAmount(forecast.actualAmountMinor)} ₺</strong>
                  </p>

                  <p>
                    Fark:{" "}
                    <strong>
                      {forecast.errorMinor >= 0 ? "+" : ""}
                      {formatAmount(forecast.errorMinor)} ₺
                    </strong>
                  </p>

                  <p>
                    Yüzdesel Fark:{" "}
                    <strong>
                      {forecast.errorPercent === null
                        ? "-"
                        : `${forecast.errorPercent >= 0 ? "+" : ""
                        }${forecast.errorPercent}%`}
                    </strong>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      {recurringError && (
        <p className="form-error" role="alert">
          {recurringError}
        </p>
      )}
    </section>
  );
}

export default RecurringExpenseSection;