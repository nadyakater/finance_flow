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
  addBranch,
  addBrand,
  addMerchant,
  addProduct,
  loadCatalog,
} from "../features/catalog/application/catalogThunks";

import {
  selectBranches,
  selectBrands,
  selectCatalogError,
  selectCatalogLoadStatus,
  selectCatalogMutationStatus,
  selectMerchants,
  selectProducts,
} from "../features/catalog/presentation/catalogSelectors";

import {
  addRefundTransaction,
  addTransaction,
  loadTransactions,
} from "../features/transactions/application/transactionThunks";

import {
  selectNetBalanceMinor,
  selectNetExpenseMinor,
  selectProductPriceAnalysis,
  selectProductPurchaseHistory,
  selectTotalIncomeMinor,
  selectTotalRefundMinor,
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

function formatTransactionDate(transactionDate, createdAtUtc) {
  if (transactionDate) {
    return new Date(`${transactionDate}T00:00:00`).toLocaleDateString("tr-TR");
  }

  return formatDate(createdAtUtc);
}

function formatAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function convertInputAmountToMinor(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return 0;
  }

  return Math.round(numericAmount * 100);
}

function getTodayDateValue() {
  const currentDate = new Date();
  const timezoneOffset = currentDate.getTimezoneOffset() * 60 * 1000;

  return new Date(currentDate.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

function createEmptyExpenseLine(id) {
  return {
    id: `expense-line-${id}`,
    categoryId: "",
    productId: "",
    brandId: "",
    purchaseQuantity: "1",
    unitCount: "1",
    unitSize: "1",
    unitType: "piece",
    unitPrice: "",
    amount: "",
    discount: "",
  };
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

function getTransactionCategoryItems(transaction, categories) {
  if (Array.isArray(transaction.lines) && transaction.lines.length > 0) {
    return transaction.lines.map((line) => {
      const lineAmountMinor = Number.isInteger(line.netAmountMinor)
        ? line.netAmountMinor
        : Number.isInteger(line.grossAmountMinor)
          ? line.grossAmountMinor -
            Number(line.lineDiscountMinor ?? 0) -
            Number(line.allocatedTransactionDiscountMinor ?? 0)
          : convertInputAmountToMinor(line.amount);

      return {
        categoryId: line.categoryId ?? "",
        categoryPathIds: Array.isArray(line.categoryPathIds)
          ? line.categoryPathIds
          : line.categoryId
            ? [line.categoryId]
            : [],
        amountMinor: lineAmountMinor,
      };
    });
  }

  return [
    {
      categoryId: transaction.categoryId ?? "",
      categoryPathIds: getTransactionCategoryPathIds(transaction, categories),
      amountMinor: Number(transaction.amountMinor ?? 0),
    },
  ];
}

function getTransactionCategoryLabel(transaction) {
  if (Array.isArray(transaction.lines) && transaction.lines.length > 0) {
    const categoryLabels = transaction.lines
      .map((line) => line.categoryPath || line.category)
      .filter(Boolean);

    const uniqueCategoryLabels = [...new Set(categoryLabels)];

    if (uniqueCategoryLabels.length > 0) {
      return uniqueCategoryLabels.join(" | ");
    }
  }

  return transaction.categoryPath || transaction.category || "-";
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

  const merchants = useSelector(selectMerchants);

  const branches = useSelector(selectBranches);

  const brands = useSelector(selectBrands);

  const products = useSelector(selectProducts);

  const catalogLoadStatus = useSelector(selectCatalogLoadStatus);

  const catalogMutationStatus = useSelector(selectCatalogMutationStatus);

  const catalogError = useSelector(selectCatalogError);

  const totalIncomeMinor = useSelector(selectTotalIncomeMinor);

  const netExpenseMinor = useSelector(selectNetExpenseMinor);

  const totalRefundMinor = useSelector(selectTotalRefundMinor);

  const netBalanceMinor = useSelector(selectNetBalanceMinor);

  const [transactionType, setTransactionType] = useState("Gelir");

  // 4.GÜN - Gelir ve gider kategorilerinin ortak state yapısı oluşturuldu.
  // 5.GÜN - Sabit kategori adı yerine kategori kimliği kullanılmaya başlandı.
  const [categoryId, setCategoryId] = useState("");

  // 4.GÜN - Kullanıcının gireceği işlem miktarı için state eklendi.
  const [amount, setAmount] = useState("");

  // 5.2.GÜN - Gider kayıtlarında tarih ve ödeme yöntemi seçilebilmesi sağlandı.
  const [transactionDate, setTransactionDate] = useState(getTodayDateValue());

  const [paymentMethod, setPaymentMethod] = useState("Nakit");

  // 5.2.GÜN - Çok satırlı gider, satır indirimi ve kategori bölme alanları oluşturuldu.
  const [expenseLines, setExpenseLines] = useState([createEmptyExpenseLine(1)]);

  const [nextExpenseLineId, setNextExpenseLineId] = useState(2);

  const [receiptTotal, setReceiptTotal] = useState("");

  const [transactionDiscount, setTransactionDiscount] = useState("");

  const [couponCode, setCouponCode] = useState("");

  // 6.GÜN - Firma ve şube seçimi için gider formu state alanları oluşturuldu.
  const [merchantId, setMerchantId] = useState("");

  const [branchId, setBranchId] = useState("");

  const [merchantName, setMerchantName] = useState("");

  const [branchName, setBranchName] = useState("");

  const [branchAddress, setBranchAddress] = useState("");

  // 6.GÜN - Marka ve ürün katalog kayıtları için form state alanları oluşturuldu.
  const [brandName, setBrandName] = useState("");

  const [productName, setProductName] = useState("");

  const [productAliases, setProductAliases] = useState("");

  const [productBrandId, setProductBrandId] = useState("");

  const [catalogFormError, setCatalogFormError] = useState("");

  // 6.GÜN - İade ve ürün fiyat analizi ekranları için state alanları oluşturuldu.
  const [refundTransactionId, setRefundTransactionId] = useState("");

  const [refundAmount, setRefundAmount] = useState("");

  const [refundReason, setRefundReason] = useState("");

  const [refundDate, setRefundDate] = useState(getTodayDateValue());

  const [selectedAnalysisProductId, setSelectedAnalysisProductId] =
    useState("");

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

  const isCatalogMutating = catalogMutationStatus === "loading";

  const selectedMerchant = useMemo(
    () => merchants.find((merchant) => merchant.id === merchantId) ?? null,
    [merchantId, merchants],
  );

  const merchantBranches = useMemo(
    () => branches.filter((branch) => branch.merchantId === merchantId),
    [branches, merchantId],
  );

  const refundableTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.transactionType === "Gider" &&
          Number(transaction.refundedMinor ?? 0) <
            Number(transaction.amountMinor ?? 0),
      ),
    [transactions],
  );

  const productPurchaseHistory = useSelector((state) =>
    selectProductPurchaseHistory(state, selectedAnalysisProductId),
  );

  const productPriceAnalysis = useSelector((state) =>
    selectProductPriceAnalysis(state, selectedAnalysisProductId),
  );

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

  // 5.2.GÜN - Gider satırlarının brüt, indirim ve net toplamları kuruş üzerinden hesaplandı.
  const expenseTotals = useMemo(() => {
    const subtotalMinor = expenseLines.reduce(
      (total, line) =>
        total + Math.max(convertInputAmountToMinor(line.amount), 0),
      0,
    );

    const lineDiscountTotalMinor = expenseLines.reduce(
      (total, line) =>
        total + Math.max(convertInputAmountToMinor(line.discount), 0),
      0,
    );

    const transactionDiscountMinor = Math.max(
      convertInputAmountToMinor(transactionDiscount),
      0,
    );

    return {
      subtotalMinor,
      lineDiscountTotalMinor,
      transactionDiscountMinor,
      netTotalMinor: Math.max(
        subtotalMinor - lineDiscountTotalMinor - transactionDiscountMinor,
        0,
      ),
    };
  }, [expenseLines, transactionDiscount]);

  // 5.GÜN - Parent kategori toplamları alt kategorilerdeki işlemler dahil edilerek hesaplandı.
  // 5.2.GÜN - Çok satırlı giderlerde her satır kendi kategori yoluna ayrı olarak eklendi.
  const categoryTotals = useMemo(() => {
    const totals = {};

    activeCategories.forEach((category) => {
      totals[category.id] = {
        incomeMinor: 0,
        expenseMinor: 0,
      };
    });

    transactions.forEach((transaction) => {
      const categoryItems = getTransactionCategoryItems(
        transaction,
        activeCategories,
      );

      categoryItems.forEach((categoryItem) => {
        categoryItem.categoryPathIds.forEach((pathCategoryId) => {
          if (!totals[pathCategoryId]) {
            return;
          }

          if (transaction.transactionType === "Gelir") {
            totals[pathCategoryId].incomeMinor += categoryItem.amountMinor;
          } else if (transaction.transactionType === "İade") {
            totals[pathCategoryId].expenseMinor -= categoryItem.amountMinor;
          } else {
            totals[pathCategoryId].expenseMinor += categoryItem.amountMinor;
          }
        });
      });
    });

    return totals;
  }, [activeCategories, transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedFilterCategoryIds.length === 0) {
      return transactions;
    }

    return transactions.filter((transaction) => {
      const categoryItems = getTransactionCategoryItems(
        transaction,
        activeCategories,
      );

      return selectedFilterCategoryIds.some((filterCategoryId) =>
        categoryItems.some((categoryItem) =>
          includeDescendants
            ? categoryItem.categoryPathIds.includes(filterCategoryId)
            : categoryItem.categoryId === filterCategoryId,
        ),
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

      // 6.GÜN - Firma, şube, marka ve ürün katalog bilgileri ana sayfa açıldığında getirildi.
      dispatch(loadCatalog(currentUser.id));
    }
  }, [dispatch, currentUser?.id]);

  // 5.GÜN - İşlem türüne uygun ilk kategori otomatik olarak seçildi.
  // 5.2.GÜN - Gelir kategorisi bulunmasa da gelir miktarı kaydedilebilir hale getirildi.
  useEffect(() => {
    if (transactionType !== "Gelir") {
      setCategoryId("");
      return;
    }

    const selectedCategoryExists = transactionCategoryOptions.some(
      (category) => category.id === categoryId,
    );

    if (!selectedCategoryExists) {
      setCategoryId(transactionCategoryOptions[0]?.id ?? "");
    }
  }, [categoryId, transactionCategoryOptions, transactionType]);

  // 5.2.GÜN - Gider satırlarında geçersiz veya boş kategori seçimi uygun ilk kategoriyle güncellendi.
  useEffect(() => {
    if (transactionType !== "Gider") {
      return;
    }

    const availableCategoryIds = new Set(
      transactionCategoryOptions.map((category) => category.id),
    );

    const defaultCategoryId = transactionCategoryOptions[0]?.id ?? "";

    setExpenseLines((currentLines) => {
      const requiresUpdate = currentLines.some(
        (line) =>
          !line.categoryId || !availableCategoryIds.has(line.categoryId),
      );

      if (!requiresUpdate) {
        return currentLines;
      }

      return currentLines.map((line) =>
        availableCategoryIds.has(line.categoryId)
          ? line
          : {
              ...line,
              categoryId: defaultCategoryId,
            },
      );
    });
  }, [transactionCategoryOptions, transactionType]);

  // 5.GÜN - Kategori türü değiştiğinde uyumsuz üst kategori seçimi temizlendi.
  useEffect(() => {
    const selectedParentIsValid = parentCategoryOptions.some(
      (category) => category.id === parentCategoryId,
    );

    if (parentCategoryId && !selectedParentIsValid) {
      setParentCategoryId("");
    }
  }, [parentCategoryId, parentCategoryOptions]);

  // 6.GÜN - Firma değiştiğinde farklı firmaya ait şube seçimi temizlendi.
  useEffect(() => {
    const selectedBranchIsValid = merchantBranches.some(
      (branch) => branch.id === branchId,
    );

    if (branchId && !selectedBranchIsValid) {
      setBranchId("");
    }
  }, [branchId, merchantBranches]);

  // 1.GÜN - Çıkış butonu Redux thunk ile Firebase çıkış işlemine bağlandı.
  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  // 4.GÜN - İşlem türüne göre kategori değişimi güncellendi.
  // 5.GÜN - İşlem türü değiştiğinde kategori ağacındaki uygun seçenekler kullanıldı.
  // 5.2.GÜN - Gelir ve çok satırlı gider formları işlem türüne göre ayrıldı.
  const handleTransactionTypeChange = (event) => {
    setTransactionType(event.target.value);

    setCategoryId("");
    setTransactionFormError("");
  };

  // 5.2.GÜN - Yeni gider satırı eklenebilmesi sağlandı.
  const handleAddExpenseLine = () => {
    setExpenseLines((currentLines) => [
      ...currentLines,
      createEmptyExpenseLine(nextExpenseLineId),
    ]);

    setNextExpenseLineId((currentId) => currentId + 1);
  };

  // 5.2.GÜN - Seçilen gider satırının formdan kaldırılması sağlandı.
  const handleRemoveExpenseLine = (lineId) => {
    setExpenseLines((currentLines) =>
      currentLines.filter((line) => line.id !== lineId),
    );

    setTransactionFormError("");
  };

  // 5.2.GÜN - Gider satırındaki kategori, tutar ve indirim alanları güncellendi.
  // 6.GÜN - Ürün, marka, miktar ve birim alanları gider satırına bağlandı.
  const handleExpenseLineChange = (lineId, fieldName, value) => {
    setExpenseLines((currentLines) =>
      currentLines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        if (fieldName === "productId") {
          const selectedProduct = products.find(
            (product) => product.id === value,
          );

          return {
            ...line,
            productId: value,
            brandId: selectedProduct?.brandId ?? line.brandId,
          };
        }

        return {
          ...line,
          [fieldName]: value,
        };
      }),
    );

    setTransactionFormError("");
  };

  // 6.GÜN - Yeni firma kaydı katalog altyapısı üzerinden oluşturuldu.
  const handleAddMerchant = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !merchantName.trim()) {
      setCatalogFormError("Firma adı zorunludur.");
      return;
    }

    const result = await dispatch(
      addMerchant({
        userId: currentUser.id,
        name: merchantName,
      }),
    );

    if (addMerchant.fulfilled.match(result)) {
      setMerchantId(result.payload.id);
      setMerchantName("");
    }
  };

  // 6.GÜN - Yeni şube seçilen firmaya bağlı olarak oluşturuldu.
  const handleAddBranch = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !selectedMerchant) {
      setCatalogFormError("Şube eklemek için önce firma seçiniz.");
      return;
    }

    if (!branchName.trim()) {
      setCatalogFormError("Şube adı zorunludur.");
      return;
    }

    const result = await dispatch(
      addBranch({
        userId: currentUser.id,
        merchantId: selectedMerchant.id,
        merchantName: selectedMerchant.name,
        name: branchName,
        address: branchAddress,
      }),
    );

    if (addBranch.fulfilled.match(result)) {
      setBranchId(result.payload.id);
      setBranchName("");
      setBranchAddress("");
    }
  };

  // 6.GÜN - Yeni marka kaydı ürün kataloğunda kullanılmak üzere oluşturuldu.
  const handleAddBrand = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !brandName.trim()) {
      setCatalogFormError("Marka adı zorunludur.");
      return;
    }

    const result = await dispatch(
      addBrand({
        userId: currentUser.id,
        name: brandName,
      }),
    );

    if (addBrand.fulfilled.match(result)) {
      setProductBrandId(result.payload.id);
      setBrandName("");
    }
  };

  // 6.GÜN - Yeni ürün marka ve alternatif ad bilgileriyle kataloğa eklendi.
  const handleAddProduct = async (event) => {
    event.preventDefault();
    setCatalogFormError("");

    if (!currentUser?.id || !productName.trim()) {
      setCatalogFormError("Ürün adı zorunludur.");
      return;
    }

    const selectedBrand = brands.find((brand) => brand.id === productBrandId);

    const result = await dispatch(
      addProduct({
        userId: currentUser.id,
        name: productName,
        aliases: productAliases
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean),
        brandId: selectedBrand?.id ?? "",
        brandName: selectedBrand?.name ?? "",
      }),
    );

    if (addProduct.fulfilled.match(result)) {
      setSelectedAnalysisProductId(result.payload.id);
      setProductName("");
      setProductAliases("");
      setProductBrandId("");
    }
  };

  // 6.GÜN - Seçilen gider için tam veya kısmi iade kaydı oluşturuldu.
  const handleAddRefund = async (event) => {
    event.preventDefault();
    setTransactionFormError("");

    if (!currentUser?.id || !refundTransactionId) {
      setTransactionFormError("İade edilecek gider kaydını seçiniz.");
      return;
    }

    if (!refundAmount || Number(refundAmount) <= 0) {
      setTransactionFormError("İade tutarı sıfırdan büyük olmalıdır.");
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

  // 3.GÜN - Seçilen gelir veya gider kaydı Ekle butonu ile kaydedildi.
  // 4.GÜN - Kategori ve miktar bilgileri kayıt işlemine eklendi.
  // 5.GÜN - Kategori kimliği ve kategori yolu işlem kaydına eklendi.
  // 5.2.GÜN - Gelir kaydı düzeltildi ve çok satırlı gider ile indirim kontrolleri eklendi.
  const handleAddTransaction = async (event) => {
    event.preventDefault();

    setTransactionFormError("");

    if (!currentUser?.id) {
      return;
    }

    if (!transactionDate) {
      setTransactionFormError("İşlem tarihi zorunludur.");
      return;
    }

    if (!paymentMethod) {
      setTransactionFormError("Ödeme yöntemi seçilmelidir.");
      return;
    }

    let transactionPayload;

    if (transactionType === "Gelir") {
      if (!amount || Number(amount) <= 0) {
        setTransactionFormError("Miktar sıfırdan büyük olmalıdır.");
        return;
      }

      const selectedTransactionCategory = activeCategories.find(
        (category) => category.id === categoryId,
      );

      transactionPayload = {
        userId: currentUser.id,
        transactionType,
        categoryId: selectedTransactionCategory?.id ?? "",
        category: selectedTransactionCategory?.name ?? "Genel Gelir",
        categoryPath:
          selectedTransactionCategory?.pathNames.join(" > ") ?? "Genel Gelir",
        categoryPathIds: selectedTransactionCategory?.pathIds ?? [],
        categoryType: selectedTransactionCategory?.categoryType ?? "income",
        amount,
        lines: [],
        transactionDiscount: "",
        couponCode: "",
        paymentMethod,
        transactionDate,
      };
    } else {
      if (transactionCategoryOptions.length === 0) {
        setTransactionFormError(
          "Gider kategorisi bulunmuyor. Önce gider türünde bir kategori oluşturunuz.",
        );
        return;
      }

      const preparedExpenseLines = [];

      for (let index = 0; index < expenseLines.length; index += 1) {
        const expenseLine = expenseLines[index];

        const selectedLineCategory = activeCategories.find(
          (category) => category.id === expenseLine.categoryId,
        );

        if (!selectedLineCategory) {
          setTransactionFormError(
            `${index + 1}. gider satırı için kategori seçiniz.`,
          );
          return;
        }

        const lineAmountMinor = convertInputAmountToMinor(expenseLine.amount);
        const lineDiscountMinor = convertInputAmountToMinor(
          expenseLine.discount,
        );

        if (lineAmountMinor <= 0) {
          setTransactionFormError(
            `${index + 1}. gider satırının tutarı sıfırdan büyük olmalıdır.`,
          );
          return;
        }

        if (lineDiscountMinor < 0 || lineDiscountMinor > lineAmountMinor) {
          setTransactionFormError(
            `${index + 1}. gider satırındaki indirim tutarı geçersizdir.`,
          );
          return;
        }

        const selectedProduct = products.find(
          (product) => product.id === expenseLine.productId,
        );

        const selectedBrand = brands.find(
          (brand) => brand.id === expenseLine.brandId,
        );

        preparedExpenseLines.push({
          id: expenseLine.id,
          categoryId: selectedLineCategory.id,
          category: selectedLineCategory.name,
          categoryPath: selectedLineCategory.pathNames.join(" > "),
          categoryPathIds: selectedLineCategory.pathIds,
          categoryType: selectedLineCategory.categoryType,
          productId: selectedProduct?.id ?? "",
          productName: selectedProduct?.name ?? "",
          brandId: selectedBrand?.id ?? selectedProduct?.brandId ?? "",
          brandName: selectedBrand?.name ?? selectedProduct?.brandName ?? "",
          purchaseQuantity: expenseLine.purchaseQuantity,
          unitCount: expenseLine.unitCount,
          unitSize: expenseLine.unitSize,
          unitType: expenseLine.unitType,
          unitPrice: expenseLine.unitPrice,
          amount: expenseLine.amount,
          discount: expenseLine.discount || 0,
        });
      }

      const totalAfterLineDiscountMinor =
        expenseTotals.subtotalMinor - expenseTotals.lineDiscountTotalMinor;

      if (
        expenseTotals.transactionDiscountMinor < 0 ||
        expenseTotals.transactionDiscountMinor > totalAfterLineDiscountMinor
      ) {
        setTransactionFormError(
          "Genel indirim tutarı gider satırlarının toplamından büyük olamaz.",
        );
        return;
      }

      if (expenseTotals.netTotalMinor <= 0) {
        setTransactionFormError(
          "Giderin net toplamı sıfırdan büyük olmalıdır.",
        );
        return;
      }

      const receiptTotalMinor = convertInputAmountToMinor(receiptTotal);

      if (receiptTotalMinor <= 0) {
        setTransactionFormError("Fiş toplamı sıfırdan büyük olmalıdır.");
        return;
      }

      if (receiptTotalMinor !== expenseTotals.netTotalMinor) {
        setTransactionFormError(
          `Fiş toplamı ${formatAmount(expenseTotals.netTotalMinor)} ₺ olmalıdır. Satır, indirim ve fiş toplamlarını kontrol ediniz.`,
        );
        return;
      }

      const firstLineCategory = activeCategories.find(
        (category) => category.id === preparedExpenseLines[0].categoryId,
      );

      transactionPayload = {
        userId: currentUser.id,
        transactionType,
        categoryId: firstLineCategory?.id ?? "",
        category: firstLineCategory?.name ?? "Gider",
        categoryPath: firstLineCategory?.pathNames.join(" > ") ?? "Gider",
        categoryPathIds: firstLineCategory?.pathIds ?? [],
        categoryType: firstLineCategory?.categoryType ?? "expense",
        amount: receiptTotal,
        lines: preparedExpenseLines,
        transactionDiscount,
        couponCode,
        paymentMethod,
        transactionDate,
        merchantId: selectedMerchant?.id ?? "",
        merchantName: selectedMerchant?.name ?? "",
        branchId:
          merchantBranches.find((branch) => branch.id === branchId)?.id ?? "",
        branchName:
          merchantBranches.find((branch) => branch.id === branchId)?.name ?? "",
      };
    }

    const result = await dispatch(addTransaction(transactionPayload));

    if (addTransaction.fulfilled.match(result)) {
      setTransactionType("Gelir");
      setCategoryId("");
      setAmount("");
      setTransactionDate(getTodayDateValue());
      setPaymentMethod("Nakit");
      setExpenseLines([createEmptyExpenseLine(1)]);
      setNextExpenseLineId(2);
      setReceiptTotal("");
      setTransactionDiscount("");
      setCouponCode("");
      setMerchantId("");
      setBranchId("");
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

        <section className="category-management-section">
          <h2 className="section-title">Firma, Şube, Marka ve Ürün Kataloğu</h2>

          <div className="category-form-grid">
            <form
              className="category-action-panel"
              onSubmit={handleAddMerchant}
            >
              <label className="form-label" htmlFor="merchantName">
                Yeni Firma
              </label>

              <input
                id="merchantName"
                className="form-input"
                type="text"
                placeholder="Firma adı"
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
              />

              <button
                className="secondary-button"
                type="submit"
                disabled={isCatalogMutating}
              >
                Firma Ekle
              </button>
            </form>

            <form className="category-action-panel" onSubmit={handleAddBranch}>
              <label className="form-label" htmlFor="catalogMerchant">
                Şubenin Firması
              </label>

              <select
                id="catalogMerchant"
                className="form-input"
                value={merchantId}
                onChange={(event) => setMerchantId(event.target.value)}
              >
                <option value="">Firma seçiniz</option>
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </option>
                ))}
              </select>

              <label className="form-label" htmlFor="branchName">
                Yeni Şube
              </label>

              <input
                id="branchName"
                className="form-input"
                type="text"
                placeholder="Şube adı"
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
              />

              <input
                className="form-input"
                type="text"
                placeholder="Adres (isteğe bağlı)"
                value={branchAddress}
                onChange={(event) => setBranchAddress(event.target.value)}
              />

              <button
                className="secondary-button"
                type="submit"
                disabled={isCatalogMutating || !merchantId}
              >
                Şube Ekle
              </button>
            </form>

            <form className="category-action-panel" onSubmit={handleAddBrand}>
              <label className="form-label" htmlFor="brandName">
                Yeni Marka
              </label>

              <input
                id="brandName"
                className="form-input"
                type="text"
                placeholder="Marka adı"
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
              />

              <button
                className="secondary-button"
                type="submit"
                disabled={isCatalogMutating}
              >
                Marka Ekle
              </button>
            </form>

            <form className="category-action-panel" onSubmit={handleAddProduct}>
              <label className="form-label" htmlFor="productName">
                Yeni Ürün
              </label>

              <input
                id="productName"
                className="form-input"
                type="text"
                placeholder="Ürün adı"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
              />

              <select
                className="form-input"
                value={productBrandId}
                onChange={(event) => setProductBrandId(event.target.value)}
              >
                <option value="">Markasız ürün</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>

              <input
                className="form-input"
                type="text"
                placeholder="Alternatif adlar: soda, maden suyu"
                value={productAliases}
                onChange={(event) => setProductAliases(event.target.value)}
              />

              <button
                className="secondary-button"
                type="submit"
                disabled={isCatalogMutating}
              >
                Ürün Ekle
              </button>
            </form>
          </div>

          {catalogLoadStatus === "loading" && (
            <p className="empty-message">Katalog bilgileri yükleniyor...</p>
          )}

          {catalogFormError && <p className="form-error">{catalogFormError}</p>}
          {catalogError && <p className="form-error">{catalogError}</p>}
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

            {/* 5.2.GÜN - İşlem tarihi alanı yeni kayıt formuna eklendi. */}
            <div>
              <label className="form-label" htmlFor="transactionDate">
                İşlem Tarihi
              </label>

              <input
                id="transactionDate"
                className="form-input"
                type="date"
                value={transactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
              />
            </div>

            {/* 5.2.GÜN - Ödeme yöntemi yeni kayıt formuna eklendi. */}
            <div>
              <label className="form-label" htmlFor="paymentMethod">
                Ödeme Yöntemi
              </label>

              <select
                id="paymentMethod"
                className="form-input"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="Nakit">Nakit</option>
                <option value="Banka Hesabı">Banka Hesabı</option>
                <option value="Banka Kartı">Banka Kartı</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Dijital Cüzdan">Dijital Cüzdan</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>

          {transactionType === "Gelir" ? (
            <>
              <div className="form-row">
                {/* 4.GÜN - Gelir ve gider kategorilerinin işlem türüne göre açılması sağlandı. */}
                {/* 5.GÜN - Sabit kategori listesi yerine Firestore kategori ağacı kullanıldı. */}
                {/* 5.2.GÜN - Gelir kategorisi bulunmasa da gelir kaydı eklenebilir hale getirildi. */}
                <div>
                  <label className="form-label" htmlFor="category">
                    Gelir Türü
                  </label>

                  <select
                    id="category"
                    className="form-input"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    disabled={categoryLoadStatus === "loading"}
                  >
                    <option value="">Genel Gelir</option>

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

              {transactionCategoryOptions.length === 0 && (
                <p className="empty-message">
                  Gelir kategorisi bulunmuyor. Kayıt Genel Gelir olarak
                  eklenecektir.
                </p>
              )}
            </>
          ) : (
            <>
              {/* 6.GÜN - Gider kaydına firma ve seçilen firmaya bağlı şube alanları eklendi. */}
              <div className="form-row">
                <div>
                  <label className="form-label" htmlFor="expenseMerchant">
                    Firma
                  </label>

                  <select
                    id="expenseMerchant"
                    className="form-input"
                    value={merchantId}
                    onChange={(event) => setMerchantId(event.target.value)}
                  >
                    <option value="">Firma seçmeden devam et</option>
                    {merchants.map((merchant) => (
                      <option key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="expenseBranch">
                    Şube
                  </label>

                  <select
                    id="expenseBranch"
                    className="form-input"
                    value={branchId}
                    onChange={(event) => setBranchId(event.target.value)}
                    disabled={!merchantId}
                  >
                    <option value="">Şube seçmeden devam et</option>
                    {merchantBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5.2.GÜN - Market fişi gibi giderler için birden fazla satır eklenmesi sağlandı. */}
              <div className="category-action-panel">
                <h3 className="archive-title">Gider Satırları</h3>

                {transactionCategoryOptions.length === 0 && (
                  <p className="form-error">
                    Gider kategorisi bulunmuyor. Önce gider türünde bir kategori
                    oluşturunuz.
                  </p>
                )}

                {expenseLines.map((line, index) => (
                  <div className="category-action-panel" key={line.id}>
                    <p className="selected-category-text">
                      <strong>{index + 1}. Gider Satırı</strong>
                    </p>

                    <div className="category-form-grid">
                      <div>
                        <label
                          className="form-label"
                          htmlFor={`expenseCategory-${line.id}`}
                        >
                          Kategori
                        </label>

                        <select
                          id={`expenseCategory-${line.id}`}
                          className="form-input"
                          value={line.categoryId}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "categoryId",
                              event.target.value,
                            )
                          }
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

                      {/* 6.GÜN - Gider satırına ürün ve marka seçimleri eklendi. */}
                      <div>
                        <label
                          className="form-label"
                          htmlFor={`expenseProduct-${line.id}`}
                        >
                          Ürün
                        </label>

                        <select
                          id={`expenseProduct-${line.id}`}
                          className="form-input"
                          value={line.productId}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "productId",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">
                            Ürün bilgisi olmadan devam et
                          </option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`expenseBrand-${line.id}`}
                        >
                          Marka
                        </label>

                        <select
                          id={`expenseBrand-${line.id}`}
                          className="form-input"
                          value={line.brandId}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "brandId",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Marka seçmeyiniz</option>
                          {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`purchaseQuantity-${line.id}`}
                        >
                          Paket / Ürün Adedi
                        </label>

                        <input
                          id={`purchaseQuantity-${line.id}`}
                          className="form-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.purchaseQuantity}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "purchaseQuantity",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`unitCount-${line.id}`}
                        >
                          Paket İçindeki Adet
                        </label>

                        <input
                          id={`unitCount-${line.id}`}
                          className="form-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.unitCount}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "unitCount",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`unitSize-${line.id}`}
                        >
                          Birim Miktarı
                        </label>

                        <input
                          id={`unitSize-${line.id}`}
                          className="form-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.unitSize}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "unitSize",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`unitType-${line.id}`}
                        >
                          Birim
                        </label>

                        <select
                          id={`unitType-${line.id}`}
                          className="form-input"
                          value={line.unitType}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "unitType",
                              event.target.value,
                            )
                          }
                        >
                          <option value="piece">Adet</option>
                          <option value="ml">Mililitre</option>
                          <option value="l">Litre</option>
                          <option value="g">Gram</option>
                          <option value="kg">Kilogram</option>
                        </select>
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`unitPrice-${line.id}`}
                        >
                          Paket Birim Fiyatı
                        </label>

                        <input
                          id={`unitPrice-${line.id}`}
                          className="form-input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="İsteğe bağlı"
                          value={line.unitPrice}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "unitPrice",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`expenseAmount-${line.id}`}
                        >
                          Satır Tutarı
                        </label>

                        <input
                          id={`expenseAmount-${line.id}`}
                          className="form-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Satır tutarı"
                          value={line.amount}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "amount",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className="form-label"
                          htmlFor={`expenseDiscount-${line.id}`}
                        >
                          Satır İndirimi
                        </label>

                        <input
                          id={`expenseDiscount-${line.id}`}
                          className="form-input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={line.discount}
                          onChange={(event) =>
                            handleExpenseLineChange(
                              line.id,
                              "discount",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    {expenseLines.length > 1 && (
                      <button
                        className="archive-button"
                        type="button"
                        onClick={() => handleRemoveExpenseLine(line.id)}
                      >
                        Satırı Kaldır
                      </button>
                    )}
                  </div>
                ))}

                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleAddExpenseLine}
                  disabled={transactionCategoryOptions.length === 0}
                >
                  Yeni Gider Satırı Ekle
                </button>
              </div>

              {/* 5.2.GÜN - Genel indirim, kupon ve fiş toplamı alanları gider formuna eklendi. */}
              <div className="form-row">
                <div>
                  <label className="form-label" htmlFor="transactionDiscount">
                    Genel İndirim
                  </label>

                  <input
                    id="transactionDiscount"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={transactionDiscount}
                    onChange={(event) =>
                      setTransactionDiscount(event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="couponCode">
                    Kupon Kodu
                  </label>

                  <input
                    id="couponCode"
                    className="form-input"
                    type="text"
                    placeholder="İsteğe bağlı"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="receiptTotal">
                    Fiş Toplamı
                  </label>

                  <input
                    id="receiptTotal"
                    className="form-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Net fiş toplamı"
                    value={receiptTotal}
                    onChange={(event) => setReceiptTotal(event.target.value)}
                  />
                </div>
              </div>

              <div className="category-action-panel">
                <p className="selected-category-text">
                  Brüt Toplam:{" "}
                  <strong>{formatAmount(expenseTotals.subtotalMinor)} ₺</strong>
                </p>

                <p className="selected-category-text">
                  Satır İndirimleri:{" "}
                  <strong>
                    {formatAmount(expenseTotals.lineDiscountTotalMinor)} ₺
                  </strong>
                </p>

                <p className="selected-category-text">
                  Genel İndirim:{" "}
                  <strong>
                    {formatAmount(expenseTotals.transactionDiscountMinor)} ₺
                  </strong>
                </p>

                <p className="selected-category-text">
                  Hesaplanan Net Toplam:{" "}
                  <strong>{formatAmount(expenseTotals.netTotalMinor)} ₺</strong>
                </p>
              </div>
            </>
          )}

          <button className="add-button" type="submit" disabled={isSaving}>
            {isSaving ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>

        {transactionFormError && (
          <p className="form-error">{transactionFormError}</p>
        )}

        {transactionError && <p className="form-error">{transactionError}</p>}

        <section className="category-management-section">
          <h2 className="section-title">6.GÜN Finans Özeti</h2>

          <div className="category-form-grid">
            <div className="category-action-panel">
              <p className="selected-category-text">Toplam Gelir</p>
              <strong>{formatAmount(totalIncomeMinor)} ₺</strong>
            </div>

            <div className="category-action-panel">
              <p className="selected-category-text">İade Sonrası Gider</p>
              <strong>{formatAmount(netExpenseMinor)} ₺</strong>
            </div>

            <div className="category-action-panel">
              <p className="selected-category-text">Toplam İade</p>
              <strong>{formatAmount(totalRefundMinor)} ₺</strong>
            </div>

            <div className="category-action-panel">
              <p className="selected-category-text">Net Bakiye</p>
              <strong>{formatAmount(netBalanceMinor)} ₺</strong>
            </div>
          </div>
        </section>

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
        </section>

        <section className="category-management-section">
          <h2 className="section-title">Ürün Fiyat Geçmişi ve Analizi</h2>

          <label className="form-label" htmlFor="analysisProduct">
            Ürün
          </label>

          <select
            id="analysisProduct"
            className="form-input"
            value={selectedAnalysisProductId}
            onChange={(event) =>
              setSelectedAnalysisProductId(event.target.value)
            }
          >
            <option value="">Ürün seçiniz</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          {selectedAnalysisProductId && productPurchaseHistory.length === 0 ? (
            <p className="empty-message">
              Bu ürün için henüz alışveriş kaydı bulunmuyor.
            </p>
          ) : (
            <>
              {productPriceAnalysis.map((analysis) => (
                <div
                  className="category-action-panel"
                  key={analysis.normalizedUnit}
                >
                  <p className="selected-category-text">
                    Birim: <strong>{analysis.normalizedUnit}</strong>
                  </p>
                  <p>En düşük: {formatAmount(analysis.minPriceMinor)} ₺</p>
                  <p>En yüksek: {formatAmount(analysis.maxPriceMinor)} ₺</p>
                  <p>Ortalama: {formatAmount(analysis.averagePriceMinor)} ₺</p>
                  <p>Medyan: {formatAmount(analysis.medianPriceMinor)} ₺</p>
                  <p>Son fiyat: {formatAmount(analysis.lastPriceMinor)} ₺</p>
                  <p>
                    Önceki alıma göre değişim:{" "}
                    {analysis.priceChangePercent === null
                      ? "Veri yok"
                      : `%${analysis.priceChangePercent}`}
                  </p>
                </div>
              ))}

              {productPurchaseHistory.length > 0 && (
                <div className="table-wrapper">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Firma / Şube</th>
                        <th>Miktar</th>
                        <th>Toplam</th>
                        <th>Normalize Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPurchaseHistory.map((purchase) => (
                        <tr
                          key={`${purchase.transactionId}-${purchase.productId}-${purchase.transactionDate}`}
                        >
                          <td>{formatDate(purchase.transactionDate)}</td>
                          <td>
                            {purchase.merchantName || "-"} /{" "}
                            {purchase.branchName || "-"}
                          </td>
                          <td>
                            {purchase.normalizedQuantity}{" "}
                            {purchase.normalizedUnit}
                          </td>
                          <td>{formatAmount(purchase.netAmountMinor)} ₺</td>
                          <td>
                            {formatAmount(purchase.normalizedUnitPriceMinor)} ₺/
                            {purchase.normalizedUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

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
                {/* 5.2.GÜN - Çok satırlı giderlerde bütün kategori yolları gösterildi. */}
                <th>Kategori</th>

                {/* 4.GÜN - Miktar bilgisi tabloya eklendi. */}
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
                            ? `Kısmi İade: ${formatAmount(transaction.refundedMinor)} ₺`
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
