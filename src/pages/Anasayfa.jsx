import { useEffect, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { logoutUser } from "../features/auth/application/authThunks";

import {
  selectAuthStatus,
  selectCurrentUser,
} from "../features/auth/presentation/authSelectors";

import {
  archiveCategoryNode,
  createCategoryNode,
  loadCategories,
  moveCategoryNode,
  restoreCategoryNode,
} from "../features/categories/application/categoryThunks";

import {
  selectActiveCategories,
  selectArchivedCategories,
  selectCategoryError,
  selectCategoryLoadStatus,
  selectCategoryMutationStatus,
  selectCategoryTree,
} from "../features/categories/presentation/categorySelectors";

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

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleString("tr-TR");
}

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getCategoryTypeLabel(categoryType) {
  const labels = {
    income: "Gelir",
    expense: "Gider",
    both: "Gelir ve Gider",
  };

  return labels[categoryType] ?? categoryType;
}

function isParentTypeAllowed(categoryType, parentCategoryType) {
  if (categoryType === "both") {
    return parentCategoryType === "both";
  }

  return parentCategoryType === "both" || parentCategoryType === categoryType;
}

function getTransactionCategoryPathIds(transaction, categories) {
  if (
    Array.isArray(transaction.categoryPathIds) &&
    transaction.categoryPathIds.length > 0
  ) {
    return transaction.categoryPathIds;
  }

  if (transaction.categoryId) {
    return [transaction.categoryId];
  }

  const expectedCategoryType =
    transaction.transactionType === "Gelir" ? "income" : "expense";

  const matchedCategory = categories.find(
    (category) =>
      category.name === transaction.category &&
      (category.categoryType === expectedCategoryType ||
        category.categoryType === "both"),
  );

  return matchedCategory?.pathIds ?? [];
}

function CategoryTreeItem({
  node,
  selectedCategoryId,
  onSelect,
  categoryTotals,
}) {
  const totals = categoryTotals[node.id] ?? {
    incomeMinor: 0,
    expenseMinor: 0,
  };

  return (
    <li className="category-tree-item">
      <button
        className={
          selectedCategoryId === node.id
            ? "category-node-button category-node-button-selected"
            : "category-node-button"
        }
        type="button"
        onClick={() => onSelect(node.id)}
      >
        <span className="category-node-main">
          <span className="category-node-name">{node.name}</span>

          <span className="category-node-type">
            {getCategoryTypeLabel(node.categoryType)}
          </span>
        </span>

        <span className="category-node-totals">
          Gelir: {formatAmount(totals.incomeMinor)} ₺ | Gider:{" "}
          {formatAmount(totals.expenseMinor)} ₺
        </span>
      </button>

      {node.children.length > 0 && (
        <ul className="category-tree-list category-tree-children">
          {node.children.map((childNode) => (
            <CategoryTreeItem
              key={childNode.id}
              node={childNode}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              categoryTotals={categoryTotals}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function Anasayfa() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const authStatus = useSelector(selectAuthStatus);

  const transactions = useSelector(selectTransactions);

  const transactionLoadStatus = useSelector(selectTransactionLoadStatus);

  const transactionSaveStatus = useSelector(selectTransactionSaveStatus);

  const transactionError = useSelector(selectTransactionError);

  const activeCategories = useSelector(selectActiveCategories);

  const archivedCategories = useSelector(selectArchivedCategories);

  const categoryTree = useSelector(selectCategoryTree);

  const categoryLoadStatus = useSelector(selectCategoryLoadStatus);

  const categoryMutationStatus = useSelector(selectCategoryMutationStatus);

  const categoryError = useSelector(selectCategoryError);

  const [transactionType, setTransactionType] = useState("Gelir");

  // 4.GÜN - Gelir ve gider kategorilerinin ortak state yapısı oluşturuldu.
  // 5.GÜN - Sabit kategori adı yerine kategori kimliği kullanılmaya başlandı.
  const [categoryId, setCategoryId] = useState("");

  // 4.GÜN - Kullanıcının gireceği işlem miktarı için state eklendi.
  const [amount, setAmount] = useState("");

  // 5.GÜN - Yeni kategori formu için gerekli state alanları oluşturuldu.
  const [categoryName, setCategoryName] = useState("");

  const [categoryType, setCategoryType] = useState("expense");

  const [parentCategoryId, setParentCategoryId] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [moveParentId, setMoveParentId] = useState("");

  // 5.GÜN - Çoklu kategori filtresi ve alt kategorileri dahil etme seçeneği oluşturuldu.
  const [selectedFilterCategoryIds, setSelectedFilterCategoryIds] = useState(
    [],
  );

  const [includeDescendants, setIncludeDescendants] = useState(true);

  const [transactionFormError, setTransactionFormError] = useState("");

  const [categoryFormError, setCategoryFormError] = useState("");

  const isLoggingOut = authStatus === "loading";

  const isSaving = transactionSaveStatus === "loading";

  const isCategoryMutating = categoryMutationStatus === "loading";

  const transactionCategoryOptions = useMemo(() => {
    const expectedCategoryType =
      transactionType === "Gelir" ? "income" : "expense";

    return activeCategories.filter(
      (category) =>
        category.isSelectable &&
        (category.categoryType === expectedCategoryType ||
          category.categoryType === "both"),
    );
  }, [activeCategories, transactionType]);

  const parentCategoryOptions = useMemo(
    () =>
      activeCategories.filter((category) =>
        isParentTypeAllowed(categoryType, category.categoryType),
      ),
    [activeCategories, categoryType],
  );

  const selectedCategory = useMemo(
    () =>
      activeCategories.find((category) => category.id === selectedCategoryId) ??
      null,
    [activeCategories, selectedCategoryId],
  );

  const moveParentOptions = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return activeCategories.filter(
      (category) =>
        category.id !== selectedCategory.id &&
        !category.pathIds.includes(selectedCategory.id) &&
        isParentTypeAllowed(
          selectedCategory.categoryType,
          category.categoryType,
        ),
    );
  }, [activeCategories, selectedCategory]);

  // 5.GÜN - Parent kategori toplamları alt kategorilerdeki işlemler dahil edilerek hesaplandı.
  const categoryTotals = useMemo(() => {
    const totals = {};

    activeCategories.forEach((category) => {
      totals[category.id] = {
        incomeMinor: 0,
        expenseMinor: 0,
      };
    });

    transactions.forEach((transaction) => {
      const categoryPathIds = getTransactionCategoryPathIds(
        transaction,
        activeCategories,
      );

      categoryPathIds.forEach((pathCategoryId) => {
        if (!totals[pathCategoryId]) {
          return;
        }

        if (transaction.transactionType === "Gelir") {
          totals[pathCategoryId].incomeMinor += Number(
            transaction.amountMinor ?? 0,
          );
        } else {
          totals[pathCategoryId].expenseMinor += Number(
            transaction.amountMinor ?? 0,
          );
        }
      });
    });

    return totals;
  }, [activeCategories, transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedFilterCategoryIds.length === 0) {
      return transactions;
    }

    return transactions.filter((transaction) => {
      const categoryPathIds = getTransactionCategoryPathIds(
        transaction,
        activeCategories,
      );

      return selectedFilterCategoryIds.some((filterCategoryId) =>
        includeDescendants
          ? categoryPathIds.includes(filterCategoryId)
          : transaction.categoryId === filterCategoryId,
      );
    });
  }, [
    activeCategories,
    includeDescendants,
    selectedFilterCategoryIds,
    transactions,
  ]);

  // 3.GÜN - Kullanıcının gelir ve gider kayıtları ana sayfa açıldığında getirildi.
  // 5.GÜN - Kullanıcının kategori ağacı ana sayfa açıldığında getirildi.
  useEffect(() => {
    if (currentUser?.id) {
      dispatch(loadTransactions(currentUser.id));

      dispatch(loadCategories(currentUser.id));
    }
  }, [dispatch, currentUser?.id]);

  // 5.GÜN - İşlem türüne uygun ilk kategori otomatik olarak seçildi.
  useEffect(() => {
    const selectedCategoryExists = transactionCategoryOptions.some(
      (category) => category.id === categoryId,
    );

    if (!selectedCategoryExists) {
      setCategoryId(transactionCategoryOptions[0]?.id ?? "");
    }
  }, [categoryId, transactionCategoryOptions]);

  // 5.GÜN - Kategori türü değiştiğinde uyumsuz üst kategori seçimi temizlendi.
  useEffect(() => {
    const selectedParentIsValid = parentCategoryOptions.some(
      (category) => category.id === parentCategoryId,
    );

    if (parentCategoryId && !selectedParentIsValid) {
      setParentCategoryId("");
    }
  }, [parentCategoryId, parentCategoryOptions]);

  // 1.GÜN - Çıkış butonu Redux thunk ile Firebase çıkış işlemine bağlandı.
  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  // 4.GÜN - İşlem türüne göre kategori değişimi güncellendi.
  // 5.GÜN - İşlem türü değiştiğinde kategori ağacındaki uygun seçenekler kullanıldı.
  const handleTransactionTypeChange = (event) => {
    setTransactionType(event.target.value);

    setCategoryId("");
    setTransactionFormError("");
  };

  // 3.GÜN - Seçilen gelir veya gider kaydı Ekle butonu ile kaydedildi.
  // 4.GÜN - Kategori ve miktar bilgileri kayıt işlemine eklendi.
  // 5.GÜN - Kategori kimliği ve kategori yolu işlem kaydına eklendi.
  const handleAddTransaction = async (event) => {
    event.preventDefault();

    setTransactionFormError("");

    if (!currentUser?.id) {
      return;
    }

    const selectedTransactionCategory = activeCategories.find(
      (category) => category.id === categoryId,
    );

    if (!selectedTransactionCategory) {
      setTransactionFormError("Önce işlem için bir kategori seçiniz.");

      return;
    }

    if (!amount || Number(amount) <= 0) {
      setTransactionFormError("Miktar sıfırdan büyük olmalıdır.");

      return;
    }

    const result = await dispatch(
      addTransaction({
        userId: currentUser.id,
        transactionType,

        categoryId: selectedTransactionCategory.id,

        category: selectedTransactionCategory.name,

        categoryPath: selectedTransactionCategory.pathNames.join(" > "),

        categoryPathIds: selectedTransactionCategory.pathIds,

        categoryType: selectedTransactionCategory.categoryType,

        amount,
      }),
    );

    if (addTransaction.fulfilled.match(result)) {
      setTransactionType("Gelir");
      setCategoryId("");
      setAmount("");
      setTransactionFormError("");
    }
  };

  // 5.GÜN - Kullanıcının ana veya alt kategori oluşturabilmesi sağlandı.
  const handleCreateCategory = async (event) => {
    event.preventDefault();

    setCategoryFormError("");

    if (!currentUser?.id) {
      return;
    }

    if (!categoryName.trim()) {
      setCategoryFormError("Kategori adı zorunludur.");

      return;
    }

    const result = await dispatch(
      createCategoryNode({
        userId: currentUser.id,
        name: categoryName,

        parentId: parentCategoryId || null,

        categoryType,
      }),
    );

    if (createCategoryNode.fulfilled.match(result)) {
      setCategoryName("");
      setParentCategoryId("");
      setCategoryFormError("");
    }
  };

  // 5.GÜN - Seçilen kategorinin güvenli şekilde başka bir üst kategoriye taşınması sağlandı.
  const handleMoveCategory = async () => {
    if (!currentUser?.id || !selectedCategory) {
      return;
    }

    const result = await dispatch(
      moveCategoryNode({
        userId: currentUser.id,

        categoryId: selectedCategory.id,

        newParentId: moveParentId || null,
      }),
    );

    if (moveCategoryNode.fulfilled.match(result)) {
      setMoveParentId("");
    }
  };

  // 5.GÜN - Seçilen kategori silinmeden alt kategorileriyle birlikte arşivlendi.
  const handleArchiveCategory = async () => {
    if (!currentUser?.id || !selectedCategory) {
      return;
    }

    const shouldArchive = window.confirm(
      `"${selectedCategory.name}" kategorisi ve bütün alt kategorileri arşivlensin mi?`,
    );

    if (!shouldArchive) {
      return;
    }

    const result = await dispatch(
      archiveCategoryNode({
        userId: currentUser.id,

        categoryId: selectedCategory.id,
      }),
    );

    if (archiveCategoryNode.fulfilled.match(result)) {
      setSelectedCategoryId("");
      setMoveParentId("");
    }
  };

  // 5.GÜN - Arşivlenen kategorinin yeniden aktif hale getirilmesi sağlandı.
  const handleRestoreCategory = async (category) => {
    if (!currentUser?.id) {
      return;
    }

    const shouldRestore = window.confirm(
      `"${category.name}" kategorisi arşivden çıkarılsın mı?`,
    );

    if (!shouldRestore) {
      return;
    }

    await dispatch(
      restoreCategoryNode({
        userId: currentUser.id,
        categoryId: category.id,
      }),
    );
  };

  // 5.GÜN - İşlem tablosunda birden fazla kategori seçilebilmesi sağlandı.
  const handleCategoryFilterChange = (filterCategoryId) => {
    setSelectedFilterCategoryIds((currentCategoryIds) =>
      currentCategoryIds.includes(filterCategoryId)
        ? currentCategoryIds.filter(
            (categoryItemId) => categoryItemId !== filterCategoryId,
          )
        : [...currentCategoryIds, filterCategoryId],
    );
  };

  return (
    <div className="page-container dashboard-page-container">
      <div className="welcome-card transaction-card">
        <h1 className="welcome-title">Hoş Geldiniz</h1>

        <p className="page-description">
          FinanceFlow ana sayfasına giriş yapıldı.
        </p>

        <p className="user-email">{currentUser?.email}</p>

        <section className="category-management-section">
          <h2 className="section-title">Sınırsız Kategori Ağacı</h2>

          <form className="category-form" onSubmit={handleCreateCategory}>
            <div className="category-form-grid">
              <div>
                <label className="form-label" htmlFor="categoryName">
                  Kategori Adı
                </label>

                <input
                  id="categoryName"
                  className="form-input"
                  type="text"
                  placeholder="Kategori adı giriniz"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="categoryType">
                  Kategori Türü
                </label>

                <select
                  id="categoryType"
                  className="form-input"
                  value={categoryType}
                  onChange={(event) => setCategoryType(event.target.value)}
                >
                  <option value="income">Gelir</option>

                  <option value="expense">Gider</option>

                  <option value="both">Gelir ve Gider</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="parentCategory">
                  Üst Kategori
                </label>

                <select
                  id="parentCategory"
                  className="form-input"
                  value={parentCategoryId}
                  onChange={(event) => setParentCategoryId(event.target.value)}
                >
                  <option value="">Ana kategori</option>

                  {parentCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.pathNames.join(" > ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="add-button"
              type="submit"
              disabled={isCategoryMutating}
            >
              {isCategoryMutating ? "İşlem Yapılıyor..." : "Kategori Ekle"}
            </button>
          </form>

          {categoryFormError && (
            <p className="form-error">{categoryFormError}</p>
          )}

          {categoryError && <p className="form-error">{categoryError}</p>}

          <div className="category-tree-panel">
            {categoryLoadStatus === "loading" &&
            activeCategories.length === 0 ? (
              <p className="empty-message">Kategoriler yükleniyor...</p>
            ) : categoryTree.length === 0 ? (
              <p className="empty-message">Henüz aktif kategori bulunmuyor.</p>
            ) : (
              <ul className="category-tree-list">
                {categoryTree.map((categoryNode) => (
                  <CategoryTreeItem
                    key={categoryNode.id}
                    node={categoryNode}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={setSelectedCategoryId}
                    categoryTotals={categoryTotals}
                  />
                ))}
              </ul>
            )}
          </div>

          {selectedCategory && (
            <div className="category-action-panel">
              <p className="selected-category-text">
                Seçili kategori:{" "}
                <strong>{selectedCategory.pathNames.join(" > ")}</strong>
              </p>

              <label className="form-label" htmlFor="moveParent">
                Yeni Üst Kategori
              </label>

              <select
                id="moveParent"
                className="form-input"
                value={moveParentId}
                onChange={(event) => setMoveParentId(event.target.value)}
              >
                <option value="">Ana kategori yap</option>

                {moveParentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.pathNames.join(" > ")}
                  </option>
                ))}
              </select>

              <div className="category-action-buttons">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleMoveCategory}
                  disabled={isCategoryMutating}
                >
                  Kategoriyi Taşı
                </button>

                <button
                  className="archive-button"
                  type="button"
                  onClick={handleArchiveCategory}
                  disabled={isCategoryMutating}
                >
                  Kategoriyi Arşivle
                </button>
              </div>
            </div>
          )}

          <div className="archive-section">
            <h3 className="archive-title">Arşivlenen Kategoriler</h3>

            {archivedCategories.length === 0 ? (
              <p className="empty-message">Arşivlenmiş kategori bulunmuyor.</p>
            ) : (
              <div className="archive-list">
                {archivedCategories.map((category) => (
                  <div className="archive-item" key={category.id}>
                    <div>
                      <p className="archive-category-name">
                        {category.pathNames.join(" > ")}
                      </p>

                      <span className="archive-category-type">
                        {getCategoryTypeLabel(category.categoryType)}
                      </span>
                    </div>

                    <button
                      className="restore-button"
                      type="button"
                      onClick={() => handleRestoreCategory(category)}
                      disabled={isCategoryMutating}
                    >
                      Arşivden Çıkar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <form className="transaction-form" onSubmit={handleAddTransaction}>
          <h2 className="section-title">Yeni Kayıt</h2>

          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="transactionType">
                İşlem Türü
              </label>

              <select
                id="transactionType"
                className="form-input"
                value={transactionType}
                onChange={handleTransactionTypeChange}
              >
                <option value="Gelir">Gelir</option>

                <option value="Gider">Gider</option>
              </select>
            </div>

            {/* 4.GÜN - Gelir ve gider kategorilerinin işlem türüne göre açılması sağlandı. */}
            {/* 5.GÜN - Sabit kategori listesi yerine Firestore kategori ağacı kullanıldı. */}
            <div>
              <label className="form-label" htmlFor="category">
                {transactionType === "Gelir" ? "Gelir Türü" : "Gider Türü"}
              </label>

              <select
                id="category"
                className="form-input"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={
                  categoryLoadStatus === "loading" ||
                  transactionCategoryOptions.length === 0
                }
              >
                <option value="">Kategori seçiniz</option>

                {transactionCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.pathNames.join(" > ")}
                  </option>
                ))}
              </select>
            </div>

            {/* 4.GÜN - Kullanıcının işlem miktarı girebilmesi için alan eklendi. */}
            <div>
              <label className="form-label" htmlFor="amount">
                Miktar
              </label>

              <input
                id="amount"
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Miktar giriniz"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>

          <button
            className="add-button"
            type="submit"
            disabled={isSaving || !categoryId}
          >
            {isSaving ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>

        {transactionFormError && (
          <p className="form-error">{transactionFormError}</p>
        )}

        {transactionError && <p className="form-error">{transactionError}</p>}

        <section className="category-filter-section">
          <div className="filter-heading-row">
            <h2 className="section-title">Kategori Filtresi</h2>

            <button
              className="filter-clear-button"
              type="button"
              onClick={() => setSelectedFilterCategoryIds([])}
              disabled={selectedFilterCategoryIds.length === 0}
            >
              Filtreyi Temizle
            </button>
          </div>

          <label className="include-descendants-label">
            <input
              type="checkbox"
              checked={includeDescendants}
              onChange={(event) => setIncludeDescendants(event.target.checked)}
            />
            Alt kategorileri dahil et
          </label>

          <div className="category-filter-list">
            {activeCategories.map((category) => (
              <label className="category-filter-item" key={category.id}>
                <input
                  type="checkbox"
                  checked={selectedFilterCategoryIds.includes(category.id)}
                  onChange={() => handleCategoryFilterChange(category.id)}
                />

                <span>{category.pathNames.join(" > ")}</span>
              </label>
            ))}
          </div>
        </section>

        <h2 className="section-title table-title">Gelir ve Gider Tablosu</h2>

        <div className="table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>İşlem Türü</th>

                {/* 4.GÜN - Kategori bilgisi tabloya eklendi. */}
                {/* 5.GÜN - Kategorinin tam yolu tablo üzerinde gösterildi. */}
                <th>Kategori</th>

                {/* 4.GÜN - Miktar bilgisi tabloya eklendi. */}
                <th>Miktar</th>

                <th>Kayıt Tarihi</th>
              </tr>
            </thead>

            <tbody>
              {transactionLoadStatus === "loading" &&
              transactions.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan="4">
                    Kayıtlar yükleniyor...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan="4">
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
                      {transaction.categoryPath || transaction.category || "-"}
                    </td>

                    <td>{formatAmount(transaction.amountMinor)} ₺</td>

                    <td>{formatDate(transaction.createdAtUtc)}</td>
                  </tr>
                ))
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
          {isLoggingOut ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
        </button>
      </div>
    </div>
  );
}

export default Anasayfa;
