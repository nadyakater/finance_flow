import { useEffect, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  addBudget,
  addSavingsTarget,
  changeBudgetActiveStatus,
  changeBudgetAmount,
  changeBudgetDescendantSetting,
  changeSavingsTargetActiveStatus,
  loadBudgets,
  loadSavingsTargets,
} from "../../application/budgetThunks";

import {
  selectActiveBudgetSummaries,
  selectBudgetError,
  selectBudgetLoadStatus,
  selectBudgetMutationStatus,
  selectBudgetRolloverCandidates,
  selectCurrentSavingsRate,
  selectEnabledSavingsTargets,
  selectSavingsTargetLoadStatus,
  selectSavingsTargetSummaries,
  selectTotalBaseBudgetMinor,
  selectTotalBudgetRemainingMinor,
  selectTotalBudgetRolloverMinor,
  selectTotalEffectiveBudgetMinor,
} from "../budgetSelectors";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

import { selectActiveCategories } from "../../../categories/presentation/categorySelectors";

import { selectActiveReportingPeriod } from "../../../reporting/presentation/reportingSelectors";

// =====================================================
// 11.GÜN
// Kuruş değerini Türk Lirası formatında gösterir.
// =====================================================

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  });
}

// =====================================================
// 11.GÜN
// TL olarak girilen değeri kuruşa çevirir.
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
// 11.GÜN
// Tarih bilgisini Türkçe biçimde gösterir.
// =====================================================

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("tr-TR");
}

// =====================================================
// 11.GÜN - Bütçe ve hedefler
//
// Kullanıcı:
//
// - kategori bütçesi oluşturabilir,
// - alt kategorileri dahil edebilir,
// - rollover kullanabilir,
// - kullanılan ve kalan bütçeyi görebilir,
// - tasarruf hedefi belirleyebilir.
// =====================================================

function BudgetSection() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const activeCategories = useSelector(selectActiveCategories);

  const activeReportingPeriod = useSelector(selectActiveReportingPeriod);

  const activeBudgetSummaries = useSelector(selectActiveBudgetSummaries);

  // =====================================================
  // 11.GÜN - 3.18 ROLLOVER
  //
  // Geçmiş dönem bütçeleri kendi dönemlerindeki gerçek
  // harcamalarla birlikte hesaplanmış olarak alınır.
  //
  // Böylece rollover miktarı kullanıcı tarafından
  // yazılmak yerine otomatik hesaplanabilir.
  // =====================================================

  const rolloverCandidates = useSelector(selectBudgetRolloverCandidates);

  const enabledSavingsTargets = useSelector(selectEnabledSavingsTargets);

  const savingsTargetSummaries = useSelector(selectSavingsTargetSummaries);

  const budgetLoadStatus = useSelector(selectBudgetLoadStatus);

  const savingsTargetLoadStatus = useSelector(selectSavingsTargetLoadStatus);

  const mutationStatus = useSelector(selectBudgetMutationStatus);

  const budgetError = useSelector(selectBudgetError);

  const totalBaseBudgetMinor = useSelector(selectTotalBaseBudgetMinor);

  const totalBudgetRolloverMinor = useSelector(selectTotalBudgetRolloverMinor);

  const totalEffectiveBudgetMinor = useSelector(
    selectTotalEffectiveBudgetMinor,
  );

  const totalBudgetRemainingMinor = useSelector(
    selectTotalBudgetRemainingMinor,
  );

  const currentSavingsRate = useSelector(selectCurrentSavingsRate);

  // =====================================================
  // 11.GÜN
  // Yeni bütçe form alanları.
  // =====================================================

  const [categoryId, setCategoryId] = useState("");

  const [budgetAmount, setBudgetAmount] = useState("");

  const [includeDescendants, setIncludeDescendants] = useState(true);

  const [rolloverEnabled, setRolloverEnabled] = useState(false);

  const [rolloverSourceBudgetId, setRolloverSourceBudgetId] = useState("");

  // =====================================================
  // 11.GÜN
  // Mevcut bütçe güncelleme alanları.
  // =====================================================

  const [updatedBudgetAmounts, setUpdatedBudgetAmounts] = useState({});

  // =====================================================
  // 11.GÜN
  // Tasarruf hedefi form alanları.
  // =====================================================

  const [savingsTargetName, setSavingsTargetName] = useState("");

  const [savingsTargetType, setSavingsTargetType] = useState("amount");

  const [savingsTargetAmount, setSavingsTargetAmount] = useState("");

  const [savingsTargetPercent, setSavingsTargetPercent] = useState("");

  const [formError, setFormError] = useState("");

  const isMutating = mutationStatus === "loading";

  // =====================================================
  // 11.GÜN - 3.18 ROLLOVER
  //
  // Kullanıcının yeni bütçe için seçtiği kategoriye ait
  // geçmiş dönem bütçeleri bulunur.
  //
  // Örneğin kullanıcı "Market" bütçesi oluşturuyorsa
  // rollover listesinde başka kategorilerin bütçeleri
  // gösterilmez.
  // =====================================================

  const matchingRolloverCandidates = useMemo(() => {
    if (!categoryId) {
      return [];
    }

    return rolloverCandidates.filter(
      (budget) => budget.categoryId === categoryId,
    );
  }, [categoryId, rolloverCandidates]);

  // =====================================================
  // 11.GÜN - 3.18 ROLLOVER
  //
  // Kullanıcının seçtiği önceki bütçe kaydı bulunur.
  // =====================================================

  const selectedRolloverBudget = useMemo(
    () =>
      matchingRolloverCandidates.find(
        (budget) => budget.id === rolloverSourceBudgetId,
      ) ?? null,

    [matchingRolloverCandidates, rolloverSourceBudgetId],
  );

  // =====================================================
  // 11.GÜN - 3.18 ROLLOVER
  //
  // Rollover miktarı OTOMATİK hesaplanır.
  //
  // Formül:
  //
  // Önceki Kullanılabilir Bütçe
  // - Önceki Dönem Kullanılan
  // = Devreden Tutar
  //
  // Bütçe aşılmışsa negatif rollover oluşmaz.
  // =====================================================

  const calculatedRolloverMinor = selectedRolloverBudget
    ? Math.max(
        Number(selectedRolloverBudget.effectiveBudgetMinor ?? 0) -
          Number(selectedRolloverBudget.spentMinor ?? 0),
        0,
      )
    : 0;

  // =====================================================
  // 11.GÜN
  // Kullanıcı giriş yaptığında bütçeler ve tasarruf
  // hedefleri yüklenir.
  // =====================================================

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    dispatch(loadBudgets(currentUser.id));

    dispatch(loadSavingsTargets(currentUser.id));
  }, [dispatch, currentUser?.id]);

  // =====================================================
  // 11.GÜN
  // Kategori değiştiğinde önceki kategoriye ait rollover
  // seçimi temizlenir.
  // =====================================================

  useEffect(() => {
    setRolloverSourceBudgetId("");
  }, [categoryId]);

  // =====================================================
  // 11.GÜN
  // Rollover kapatılırsa seçilen kaynak temizlenir.
  // =====================================================

  useEffect(() => {
    if (!rolloverEnabled) {
      setRolloverSourceBudgetId("");
    }
  }, [rolloverEnabled]);

  // =====================================================
  // 11.GÜN
  // Yeni kategori bütçesi oluşturur.
  // =====================================================

  const handleAddBudget = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!currentUser?.id) {
      setFormError("Bütçe oluşturmak için kullanıcı oturumu bulunamadı.");

      return;
    }

    if (!activeReportingPeriod?.startDate || !activeReportingPeriod?.endDate) {
      setFormError(
        "Bütçe oluşturmak için geçerli bir finansal dönem bulunamadı.",
      );

      return;
    }

    if (!categoryId) {
      setFormError("Bütçe için bir kategori seçmelisiniz.");

      return;
    }

    const selectedCategory = activeCategories.find(
      (category) => category.id === categoryId,
    );

    if (!selectedCategory) {
      setFormError("Seçilen kategori bulunamadı.");

      return;
    }

    const budgetAmountMinor = convertAmountToMinor(budgetAmount);

    if (budgetAmountMinor <= 0) {
      setFormError("Bütçe tutarı sıfırdan büyük olmalıdır.");

      return;
    }

    // =====================================================
    // 11.GÜN - 3.18 ROLLOVER
    //
    // Rollover açıkken önceki dönem bütçesi seçilmesi
    // zorunludur.
    // =====================================================

    if (rolloverEnabled && !selectedRolloverBudget) {
      setFormError("Rollover için önceki dönem bütçesini seçmelisiniz.");

      return;
    }

    const result = await dispatch(
      addBudget({
        userId: currentUser.id,

        categoryId: selectedCategory.id,

        categoryName: selectedCategory.name,

        categoryPath: selectedCategory.path ?? selectedCategory.name,

        includeDescendants,

        budgetAmountMinor,

        periodStart: activeReportingPeriod.startDate,

        periodEnd: activeReportingPeriod.endDate,

        reportingMode: activeReportingPeriod.mode,

        // =====================================================
        // 11.GÜN - 3.18 ROLLOVER
        //
        // Kullanıcının rollover tercihi saklanır.
        // =====================================================

        rolloverEnabled,

        // =====================================================
        // 11.GÜN
        // Rollover'ın hangi geçmiş bütçeden geldiği
        // Firestore'da ayrıca tutulur.
        // =====================================================

        rolloverSourceBudgetId: rolloverEnabled
          ? selectedRolloverBudget.id
          : "",

        // =====================================================
        // 11.GÜN
        // Kullanıcı tutarı elle girmez.
        //
        // Sistem geçmiş bütçenin kullanılmayan kısmını
        // otomatik hesaplayarak kaydeder.
        // =====================================================

        rolloverAmountMinor: rolloverEnabled ? calculatedRolloverMinor : 0,
      }),
    );

    if (addBudget.fulfilled.match(result)) {
      setCategoryId("");

      setBudgetAmount("");

      setIncludeDescendants(true);

      setRolloverEnabled(false);

      setRolloverSourceBudgetId("");
    }
  };

  // =====================================================
  // 11.GÜN
  // Mevcut bütçenin limitini günceller.
  // =====================================================

  const handleBudgetAmountUpdate = async (budget) => {
    setFormError("");

    if (!currentUser?.id) {
      return;
    }

    const newAmount = updatedBudgetAmounts[budget.id] ?? "";

    const budgetAmountMinor = convertAmountToMinor(newAmount);

    if (budgetAmountMinor <= 0) {
      setFormError("Yeni bütçe tutarı sıfırdan büyük olmalıdır.");

      return;
    }

    await dispatch(
      changeBudgetAmount({
        userId: currentUser.id,

        budgetId: budget.id,

        budgetAmountMinor,
      }),
    );

    setUpdatedBudgetAmounts((currentValues) => ({
      ...currentValues,

      [budget.id]: "",
    }));
  };

  // =====================================================
  // 11.GÜN
  // Alt kategori dahil/hariç ayarını değiştirir.
  // =====================================================

  const handleDescendantSettingChange = async (budget) => {
    if (!currentUser?.id) {
      return;
    }

    await dispatch(
      changeBudgetDescendantSetting({
        userId: currentUser.id,

        budgetId: budget.id,

        includeDescendants: !budget.includeDescendants,
      }),
    );
  };

  // =====================================================
  // 11.GÜN
  // Bütçeyi aktif veya pasif yapar.
  // =====================================================

  const handleBudgetStatusChange = async (budget) => {
    if (!currentUser?.id) {
      return;
    }

    await dispatch(
      changeBudgetActiveStatus({
        userId: currentUser.id,

        budgetId: budget.id,

        isActive: !budget.isActive,
      }),
    );
  };

  // =====================================================
  // 11.GÜN
  // Yeni tasarruf hedefi oluşturur.
  // =====================================================

  const handleAddSavingsTarget = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!currentUser?.id) {
      setFormError("Tasarruf hedefi için kullanıcı oturumu bulunamadı.");

      return;
    }

    if (!activeReportingPeriod?.startDate || !activeReportingPeriod?.endDate) {
      setFormError(
        "Tasarruf hedefi için geçerli bir finansal dönem bulunamadı.",
      );

      return;
    }

    let targetAmountMinor = 0;

    let targetPercent = null;

    if (savingsTargetType === "amount") {
      targetAmountMinor = convertAmountToMinor(savingsTargetAmount);

      if (targetAmountMinor <= 0) {
        setFormError("Tasarruf hedefi tutarı sıfırdan büyük olmalıdır.");

        return;
      }
    }

    if (savingsTargetType === "incomePercent") {
      targetPercent = Number(savingsTargetPercent);

      if (
        !Number.isFinite(targetPercent) ||
        targetPercent <= 0 ||
        targetPercent > 100
      ) {
        setFormError("Tasarruf hedefi yüzdesi 0 ile 100 arasında olmalıdır.");

        return;
      }
    }

    const result = await dispatch(
      addSavingsTarget({
        userId: currentUser.id,

        name: savingsTargetName,

        targetType: savingsTargetType,

        targetAmountMinor,

        targetPercent,

        periodStart: activeReportingPeriod.startDate,

        periodEnd: activeReportingPeriod.endDate,

        reportingMode: activeReportingPeriod.mode,
      }),
    );

    if (addSavingsTarget.fulfilled.match(result)) {
      setSavingsTargetName("");

      setSavingsTargetType("amount");

      setSavingsTargetAmount("");

      setSavingsTargetPercent("");
    }
  };

  // =====================================================
  // 11.GÜN
  // Tasarruf hedefini aktif/pasif yapar.
  // =====================================================

  const handleSavingsTargetStatusChange = async (target) => {
    if (!currentUser?.id) {
      return;
    }

    await dispatch(
      changeSavingsTargetActiveStatus({
        userId: currentUser.id,

        savingsTargetId: target.id,

        isActive: !target.isActive,
      }),
    );
  };

  return (
    <section>
      <h2 className="section-title">Bütçe ve Hedefler</h2>

      {/* =====================================================
          11.GÜN
          Aktif finansal dönem gösterilir.
          ===================================================== */}

      <div className="category-action-panel">
        <h3>Aktif Bütçe Dönemi</h3>

        {activeReportingPeriod?.startDate && activeReportingPeriod?.endDate ? (
          <p>
            {formatDate(activeReportingPeriod.startDate)}
            {" - "}
            {formatDate(activeReportingPeriod.endDate)}
          </p>
        ) : (
          <p className="empty-message">Geçerli finansal dönem bulunamadı.</p>
        )}
      </div>

      {/* =====================================================
          11.GÜN
          Yeni kategori bütçesi.
          ===================================================== */}

      <form className="category-action-panel" onSubmit={handleAddBudget}>
        <h3>Yeni Kategori Bütçesi</h3>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="budgetCategory">
              Kategori *
            </label>

            <select
              id="budgetCategory"
              className="form-input"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={isMutating}
              required
            >
              <option value="">Kategori seçin</option>

              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.path ?? category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="budgetAmount">
              Bütçe Limiti *
            </label>

            <input
              id="budgetAmount"
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.target.value)}
              disabled={isMutating}
              required
            />
          </div>
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={includeDescendants}
            onChange={(event) => setIncludeDescendants(event.target.checked)}
          />
          Alt kategorileri de bütçeye dahil et
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={rolloverEnabled}
            onChange={(event) => setRolloverEnabled(event.target.checked)}
          />
          Önceki dönemden kullanılmayan bütçeyi devret
        </label>

        {rolloverEnabled && (
          <div className="category-action-panel">
            <h4>Rollover Hesaplama</h4>

            {!categoryId ? (
              <p className="empty-message">Önce bütçe kategorisini seçin.</p>
            ) : matchingRolloverCandidates.length === 0 ? (
              <p className="empty-message">
                Bu kategori için kullanılabilecek geçmiş dönem bütçesi
                bulunamadı.
              </p>
            ) : (
              <>
                <label className="form-label" htmlFor="rolloverSourceBudget">
                  Önceki Dönem Bütçesi *
                </label>

                <select
                  id="rolloverSourceBudget"
                  className="form-input"
                  value={rolloverSourceBudgetId}
                  onChange={(event) =>
                    setRolloverSourceBudgetId(event.target.value)
                  }
                >
                  <option value="">Önceki bütçeyi seçin</option>

                  {matchingRolloverCandidates.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {formatDate(budget.periodStart)}
                      {" - "}
                      {formatDate(budget.periodEnd)}
                      {" | Kalan: "}
                      {formatAmount(Math.max(budget.remainingMinor, 0))}
                      {" ₺"}
                    </option>
                  ))}
                </select>
              </>
            )}

            {selectedRolloverBudget && (
              <div className="installment-summary-panel">
                <p>
                  <strong>Rollover Kaynağı:</strong>{" "}
                  {selectedRolloverBudget.categoryPath ||
                    selectedRolloverBudget.categoryName}
                </p>

                <p>
                  <strong>Kaynak Dönem:</strong>{" "}
                  {formatDate(selectedRolloverBudget.periodStart)}
                  {" - "}
                  {formatDate(selectedRolloverBudget.periodEnd)}
                </p>

                <p>
                  <strong>Önceki Temel Bütçe:</strong>{" "}
                  {formatAmount(selectedRolloverBudget.baseBudgetMinor)} ₺
                </p>

                <p>
                  <strong>Önceki Dönem Rollover:</strong>{" "}
                  {formatAmount(selectedRolloverBudget.rolloverMinor)} ₺
                </p>

                <p>
                  <strong>Önceki Kullanılabilir Bütçe:</strong>{" "}
                  {formatAmount(selectedRolloverBudget.effectiveBudgetMinor)} ₺
                </p>

                <p>
                  <strong>Önceki Dönem Kullanılan:</strong>{" "}
                  {formatAmount(selectedRolloverBudget.spentMinor)} ₺
                </p>

                <p>
                  <strong>Hesap Yöntemi:</strong> Kullanılabilir Bütçe -
                  Kullanılan Tutar
                </p>

                <p>
                  <strong>Otomatik Devreden Tutar:</strong>{" "}
                  {formatAmount(calculatedRolloverMinor)} ₺
                </p>
              </div>
            )}
          </div>
        )}

        <button
          className="secondary-button"
          type="submit"
          disabled={isMutating}
        >
          {isMutating ? "Kaydediliyor..." : "Bütçe Oluştur"}
        </button>
      </form>

      {/* =====================================================
          11.GÜN
          Aktif dönem bütçe toplamları.
          ===================================================== */}

      <div className="category-form-grid">
        <div className="category-action-panel">
          <p className="selected-category-text">Temel Bütçe</p>

          <strong>{formatAmount(totalBaseBudgetMinor)} ₺</strong>
        </div>

        <div className="category-action-panel">
          <p className="selected-category-text">Rollover</p>

          <strong>{formatAmount(totalBudgetRolloverMinor)} ₺</strong>
        </div>

        <div className="category-action-panel">
          <p className="selected-category-text">Kullanılabilir Bütçe</p>

          <strong>{formatAmount(totalEffectiveBudgetMinor)} ₺</strong>
        </div>

        <div className="category-action-panel">
          <p className="selected-category-text">Toplam Kalan</p>

          <strong>{formatAmount(totalBudgetRemainingMinor)} ₺</strong>
        </div>
      </div>

      {budgetLoadStatus === "loading" && (
        <p className="empty-message">Bütçeler yükleniyor...</p>
      )}

      {budgetLoadStatus === "succeeded" &&
        activeBudgetSummaries.length === 0 && (
          <p className="empty-message">
            Bu finansal dönem için henüz bütçe oluşturulmadı.
          </p>
        )}

      {/* =====================================================
          11.GÜN
          Aktif kategori bütçeleri.
          ===================================================== */}

      {activeBudgetSummaries.map((budget) => (
        <div key={budget.id} className="category-action-panel">
          <h3>{budget.categoryPath || budget.categoryName}</h3>

          <p>
            <strong>Dönem:</strong> {formatDate(budget.periodStart)}
            {" - "}
            {formatDate(budget.periodEnd)}
          </p>

          <p>
            <strong>Temel Limit:</strong> {formatAmount(budget.baseBudgetMinor)}{" "}
            ₺
          </p>

          <p>
            <strong>Rollover:</strong> {formatAmount(budget.rolloverMinor)} ₺
          </p>

          {budget.rolloverEnabled && budget.rolloverSourceBudgetId && (
            <p>
              <strong>Rollover Kaynağı:</strong> Önceki dönem bütçesi
            </p>
          )}

          <p>
            <strong>Kullanılabilir Limit:</strong>{" "}
            {formatAmount(budget.effectiveBudgetMinor)} ₺
          </p>

          <p>
            <strong>Kullanılan:</strong> {formatAmount(budget.spentMinor)} ₺
          </p>

          <p>
            <strong>Kalan:</strong> {formatAmount(budget.remainingMinor)} ₺
          </p>

          <p>
            <strong>Kullanım:</strong>{" "}
            {budget.usagePercent === null ? "-" : `%${budget.usagePercent}`}
          </p>

          <p>
            <strong>Alt Kategoriler:</strong>{" "}
            {budget.includeDescendants ? "Dahil" : "Dahil Değil"}
          </p>

          {budget.exceeded && (
            <p className="form-error">Bütçe limiti aşıldı.</p>
          )}

          {/* 12.GÜN - 3.24 - Bütçe işlem butonları daha kısa ve yan yana duracak şekilde düzenlendi. */}
          <div className="category-action-panel">
            <label
              className="form-label"
              htmlFor={`budget-update-${budget.id}`}
            >
              Yeni Bütçe Limiti
            </label>

            <input
              id={`budget-update-${budget.id}`}
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Yeni bütçe limiti"
              value={updatedBudgetAmounts[budget.id] ?? ""}
              onChange={(event) =>
                setUpdatedBudgetAmounts((currentValues) => ({
                  ...currentValues,

                  [budget.id]: event.target.value,
                }))
              }
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              <button
                className="add-button"
                type="button"
                onClick={() => handleBudgetAmountUpdate(budget)}
                disabled={isMutating}
                style={{
                  width: "auto",
                  minWidth: "190px",
                  padding: "12px 18px",
                }}
              >
                Limiti Güncelle
              </button>

              <button
                className="add-button"
                type="button"
                onClick={() => handleDescendantSettingChange(budget)}
                disabled={isMutating}
                style={{
                  width: "auto",
                  minWidth: "240px",
                  padding: "12px 18px",
                }}
              >
                {budget.includeDescendants
                  ? "Alt Kategorileri Hariç Tut"
                  : "Alt Kategorileri Dahil Et"}
              </button>

              <button
                className="add-button"
                type="button"
                onClick={() => handleBudgetStatusChange(budget)}
                disabled={isMutating}
                style={{
                  width: "auto",
                  minWidth: "190px",
                  padding: "12px 18px",
                }}
              >
                {budget.isActive ? "Bütçeyi Pasif Yap" : "Bütçeyi Aktif Yap"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* =====================================================
          11.GÜN - Tasarruf hedefi
          ===================================================== */}

      <form className="category-action-panel" onSubmit={handleAddSavingsTarget}>
        <h3>Yeni Tasarruf Hedefi</h3>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="savingsTargetName">
              Hedef Adı
            </label>

            <input
              id="savingsTargetName"
              className="form-input"
              type="text"
              value={savingsTargetName}
              onChange={(event) => setSavingsTargetName(event.target.value)}
              placeholder="Örnek: Aylık Tasarruf"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="savingsTargetType">
              Hedef Türü *
            </label>

            <select
              id="savingsTargetType"
              className="form-input"
              value={savingsTargetType}
              onChange={(event) => setSavingsTargetType(event.target.value)}
            >
              <option value="amount">Sabit Tutar</option>

              <option value="incomePercent">Gelir Yüzdesi</option>
            </select>
          </div>

          {savingsTargetType === "amount" && (
            <div>
              <label className="form-label" htmlFor="savingsTargetAmount">
                Hedef Tutar *
              </label>

              <input
                id="savingsTargetAmount"
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                value={savingsTargetAmount}
                onChange={(event) => setSavingsTargetAmount(event.target.value)}
                placeholder="0,00"
              />
            </div>
          )}

          {savingsTargetType === "incomePercent" && (
            <div>
              <label className="form-label" htmlFor="savingsTargetPercent">
                Gelirin Yüzdesi *
              </label>

              <input
                id="savingsTargetPercent"
                className="form-input"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={savingsTargetPercent}
                onChange={(event) =>
                  setSavingsTargetPercent(event.target.value)
                }
                placeholder="%20"
              />
            </div>
          )}
        </div>

        <button
          className="secondary-button"
          type="submit"
          disabled={isMutating}
        >
          Tasarruf Hedefi Oluştur
        </button>
      </form>

      {/* =====================================================
          11.GÜN
          Mevcut tasarruf oranı.
          ===================================================== */}

      <div className="category-action-panel">
        <h3>Mevcut Tasarruf Oranı</h3>

        {currentSavingsRate === null ? (
          <p className="empty-message">
            Gelir olmadığı için tasarruf oranı hesaplanamıyor.
          </p>
        ) : (
          <strong>
            {currentSavingsRate < 0
              ? `-%${Math.abs(currentSavingsRate).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,

                  maximumFractionDigits: 2,
                })}`
              : `%${currentSavingsRate.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,

                  maximumFractionDigits: 2,
                })}`}
          </strong>
        )}
      </div>

      {/* =====================================================
          11.GÜN
          Aktif tasarruf hedefleri.
          ===================================================== */}

      {savingsTargetLoadStatus === "loading" && (
        <p className="empty-message">Tasarruf hedefleri yükleniyor...</p>
      )}

      {savingsTargetSummaries.map((target) => (
        <div key={target.id} className="category-action-panel">
          <h3>{target.name}</h3>

          <p>
            <strong>Hedef Türü:</strong>{" "}
            {target.targetType === "incomePercent"
              ? `Gelirin %${target.targetPercent}'i`
              : "Sabit Tutar"}
          </p>

          <p>
            <strong>Hesaplanan Hedef:</strong>{" "}
            {formatAmount(target.calculatedTargetMinor)} ₺
          </p>

          <p>
            <strong>Mevcut Tasarruf:</strong>{" "}
            {formatAmount(target.currentSavingsMinor)} ₺
          </p>

          <p>
            <strong>Hedefe Kalan:</strong> {formatAmount(target.remainingMinor)}{" "}
            ₺
          </p>

          <p>
            <strong>İlerleme:</strong>{" "}
            {target.progressPercent === null
              ? "-"
              : `%${target.progressPercent}`}
          </p>

          {target.completed && (
            <p className="success-message">Tasarruf hedefine ulaşıldı.</p>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={() => handleSavingsTargetStatusChange(target)}
            disabled={isMutating}
          >
            {target.isActive ? "Hedefi Pasif Yap" : "Hedefi Aktif Yap"}
          </button>
        </div>
      ))}

      {enabledSavingsTargets.length === 0 &&
        savingsTargetLoadStatus === "succeeded" && (
          <p className="empty-message">
            Henüz aktif tasarruf hedefi bulunmuyor.
          </p>
        )}

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      {budgetError && (
        <p className="form-error" role="alert">
          {budgetError}
        </p>
      )}
    </section>
  );
}

export default BudgetSection;
