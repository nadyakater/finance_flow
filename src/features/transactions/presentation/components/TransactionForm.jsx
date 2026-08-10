import { useEffect, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { addTransaction } from "../../application/transactionThunks";

import { selectTransactionSaveStatus } from "../transactionSelectors";

import {
  selectActiveCategories,
  selectCategoryLoadStatus,
} from "../../../categories/presentation/categorySelectors";

import {
  selectBranches,
  selectBrands,
  selectMerchants,
  selectProducts,
} from "../../../catalog/presentation/catalogSelectors";

import { selectActiveCreditCards } from "../../../creditCards/presentation/creditCardSelectors";

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

import ExpenseForm from "./ExpenseForm";

const FUEL_TOTAL_TOLERANCE_MINOR = 5;

function createEmptyExpenseLine(id) {
  return {
    id: `expense-line-${id}`,

    categoryId: "",

    productId: "",

    productType: "standard",

    brandId: "",

    purchaseQuantity: "1",

    unitCount: "1",

    unitSize: "1",

    unitType: "adet",

    unitPrice: "",

    fuelType: "gasoline",

    liters: "",

    fuelUnitPrice: "",

    vehicleId: "",

    odometer: "",

    amount: "",

    discount: "",

    note: "",
  };
}

function getSafeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const normalizedValue =
    typeof value === "string" ? value.replace(",", ".") : value;

  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function calculateFuelTotalMinor(liters, fuelUnitPrice) {
  const numericLiters = getSafeNumber(liters);

  const numericUnitPrice = getSafeNumber(fuelUnitPrice);

  if (numericLiters <= 0 || numericUnitPrice <= 0) {
    return 0;
  }

  return Math.round(numericLiters * numericUnitPrice * 100);
}

// =====================================================
// 7.GÜN
// Gelir ve çok satırlı gider kayıt formu oluşturuldu.
//
// Kalıcı veriler Redux üzerinden alınır ve Firebase'e
// doğrudan erişim yapılmaz.
// =====================================================

// =====================================================
// 8.GÜN
// Yakıt ürünleri için yakıt türü, litre, litre fiyatı,
// araç ve odometre alanları desteklendi.
// =====================================================

// =====================================================
// 11.GÜN
// Kredi kartıyla yapılan giderlerde tek çekim veya taksitli
// ödeme seçilebilmesi için sade ödeme alanları eklendi.
// =====================================================

function TransactionForm() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);

  const transactionSaveStatus = useSelector(selectTransactionSaveStatus);

  const activeCategories = useSelector(selectActiveCategories);

  const categoryLoadStatus = useSelector(selectCategoryLoadStatus);

  const products = useSelector(selectProducts);

  const brands = useSelector(selectBrands);

  const merchants = useSelector(selectMerchants);

  const branches = useSelector(selectBranches);

  const activeCreditCards = useSelector(selectActiveCreditCards);

  const getTodayDateValue = () => {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatAmount = (amountMinor) =>
    (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,

      maximumFractionDigits: 2,
    });

  const convertInputAmountToMinor = (value) => {
    const numericValue = getSafeNumber(value);

    if (numericValue <= 0) {
      return 0;
    }

    return Math.round(numericValue * 100);
  };

  const [transactionType, setTransactionType] = useState("Gelir");

  const [categoryId, setCategoryId] = useState("");

  const [amount, setAmount] = useState("");

  const [description, setDescription] = useState("");

  const [transactionDate, setTransactionDate] = useState(getTodayDateValue());

  const [paymentMethod, setPaymentMethod] = useState("Nakit");

  const [selectedCreditCardId, setSelectedCreditCardId] = useState("");

  // 11.GÜN - Kredi kartı giderinin tek çekim veya taksitli olduğunu tutan form bilgisi eklendi.
  const [installmentType, setInstallmentType] = useState("single");

  // 11.GÜN - Taksitli ödeme seçildiğinde kullanıcının yalnızca taksit sayısını girmesi sağlandı.
  const [installmentCount, setInstallmentCount] = useState("2");

  const [expenseLines, setExpenseLines] = useState([createEmptyExpenseLine(1)]);

  const [nextExpenseLineId, setNextExpenseLineId] = useState(2);

  const [transactionDiscount, setTransactionDiscount] = useState("");

  const [couponCode, setCouponCode] = useState("");

  const [merchantId, setMerchantId] = useState("");

  const [branchId, setBranchId] = useState("");

  const [transactionFormError, setTransactionFormError] = useState("");

  const isSaving = transactionSaveStatus === "loading";

  const selectedMerchant = useMemo(
    () => merchants.find((merchant) => merchant.id === merchantId) ?? null,
    [merchantId, merchants],
  );

  const selectedCreditCard = useMemo(
    () =>
      activeCreditCards.find(
        (creditCard) => creditCard.id === selectedCreditCardId,
      ) ?? null,
    [activeCreditCards, selectedCreditCardId],
  );

  const merchantBranches = useMemo(
    () => branches.filter((branch) => branch.merchantId === merchantId),
    [branches, merchantId],
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

  useEffect(() => {
    const selectedBranchIsValid = merchantBranches.some(
      (branch) => branch.id === branchId,
    );

    if (branchId && !selectedBranchIsValid) {
      setBranchId("");
    }
  }, [branchId, merchantBranches]);

  // 10.GÜN - Ödeme yöntemi değiştiğinde geçersiz kredi kartı seçiminin temizlenmesi sağlandı.
  useEffect(() => {
    if (transactionType !== "Gider" || paymentMethod !== "Kredi Kartı") {
      setSelectedCreditCardId("");

      return;
    }

    const selectedCardIsActive = activeCreditCards.some(
      (creditCard) => creditCard.id === selectedCreditCardId,
    );

    if (selectedCreditCardId && !selectedCardIsActive) {
      setSelectedCreditCardId("");
    }
  }, [activeCreditCards, paymentMethod, selectedCreditCardId, transactionType]);

  // 11.GÜN - Kredi kartı dışındaki ödeme yöntemlerinde taksit bilgileri başlangıç değerlerine döndürülür.
  useEffect(() => {
    if (transactionType !== "Gider" || paymentMethod !== "Kredi Kartı") {
      setInstallmentType("single");

      setInstallmentCount("2");
    }
  }, [paymentMethod, transactionType]);

  const resetTransactionForm = () => {
    setTransactionType("Gelir");

    setCategoryId("");

    setAmount("");

    setDescription("");

    setTransactionDate(getTodayDateValue());

    setPaymentMethod("Nakit");

    setSelectedCreditCardId("");

    setInstallmentType("single");

    setInstallmentCount("2");

    setExpenseLines([createEmptyExpenseLine(1)]);

    setNextExpenseLineId(2);

    setTransactionDiscount("");

    setCouponCode("");

    setMerchantId("");

    setBranchId("");

    setTransactionFormError("");
  };

  const handleTransactionTypeChange = (event) => {
    const selectedTransactionType = event.target.value;

    setTransactionType(selectedTransactionType);

    setCategoryId("");

    setSelectedCreditCardId("");

    setInstallmentType("single");

    setInstallmentCount("2");

    setTransactionFormError("");

    if (selectedTransactionType === "Gelir") {
      setTransactionDiscount("");

      setCouponCode("");

      setMerchantId("");

      setBranchId("");

      setExpenseLines([createEmptyExpenseLine(1)]);

      setNextExpenseLineId(2);
    }
  };

  const handlePaymentMethodChange = (event) => {
    const selectedPaymentMethod = event.target.value;

    setPaymentMethod(selectedPaymentMethod);

    setTransactionFormError("");

    if (selectedPaymentMethod !== "Kredi Kartı") {
      setSelectedCreditCardId("");

      setInstallmentType("single");

      setInstallmentCount("2");
    }
  };

  const handleInstallmentTypeChange = (event) => {
    const selectedInstallmentType = event.target.value;

    setInstallmentType(selectedInstallmentType);

    setTransactionFormError("");

    if (selectedInstallmentType === "single") {
      setInstallmentCount("2");
    }
  };

  const handleAddExpenseLine = () => {
    setExpenseLines((currentLines) => [
      ...currentLines,

      createEmptyExpenseLine(nextExpenseLineId),
    ]);

    setNextExpenseLineId((currentId) => currentId + 1);

    setTransactionFormError("");
  };

  const handleRemoveExpenseLine = (lineId) => {
    setExpenseLines((currentLines) => {
      if (currentLines.length === 1) {
        return currentLines;
      }

      return currentLines.filter((line) => line.id !== lineId);
    });

    setTransactionFormError("");
  };

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

          if (!selectedProduct) {
            return {
              ...line,

              productId: "",

              productType: "standard",

              brandId: "",

              purchaseQuantity: "1",

              unitCount: "1",

              unitSize: "1",

              unitType: "adet",

              unitPrice: "",

              fuelType: "gasoline",

              liters: "",

              fuelUnitPrice: "",

              vehicleId: "",

              odometer: "",

              amount: "",
            };
          }

          const selectedProductType =
            selectedProduct.productType === "fuel" ? "fuel" : "standard";

          if (selectedProductType === "fuel") {
            return {
              ...line,

              productId: selectedProduct.id,

              productType: "fuel",

              brandId: selectedProduct.brandId ?? "",

              fuelType: selectedProduct.fuelType || "gasoline",

              liters: "",

              fuelUnitPrice: selectedProduct.defaultUnitPrice ?? "",

              vehicleId: "",

              odometer: "",

              purchaseQuantity: "1",

              unitCount: "1",

              unitSize: "1",

              unitType: "l",

              unitPrice: "",

              amount: "",
            };
          }

          return {
            ...line,

            productId: selectedProduct.id,

            productType: "standard",

            brandId: selectedProduct.brandId ?? "",

            purchaseQuantity: "1",

            unitCount: String(selectedProduct.unitCount ?? 1),

            unitSize: String(selectedProduct.unitSize ?? 1),

            unitType: selectedProduct.unitType ?? "adet",

            unitPrice: selectedProduct.defaultUnitPrice ?? "",

            fuelType: "",

            liters: "",

            fuelUnitPrice: "",

            vehicleId: "",

            odometer: "",

            amount: "",
          };
        }

        const updatedLine = {
          ...line,

          [fieldName]: value,
        };

        if (
          updatedLine.productType === "fuel" &&
          (fieldName === "liters" || fieldName === "fuelUnitPrice")
        ) {
          const fuelTotalMinor = calculateFuelTotalMinor(
            updatedLine.liters,
            updatedLine.fuelUnitPrice,
          );

          updatedLine.amount =
            fuelTotalMinor > 0 ? (fuelTotalMinor / 100).toFixed(2) : "";
        }

        return updatedLine;
      }),
    );

    setTransactionFormError("");
  };

  const prepareExpenseLines = () => {
    if (expenseLines.length === 0) {
      throw new Error("En az bir gider satırı eklemelisiniz.");
    }

    return expenseLines.map((expenseLine, index) => {
      const lineNumber = index + 1;

      const selectedLineCategory = activeCategories.find(
        (category) => category.id === expenseLine.categoryId,
      );

      if (!selectedLineCategory) {
        throw new Error(`${lineNumber}. gider satırı için kategori seçiniz.`);
      }

      const lineAmount = getSafeNumber(expenseLine.amount);

      if (lineAmount <= 0) {
        throw new Error(
          `${lineNumber}. gider satırının tutarı sıfırdan büyük olmalıdır.`,
        );
      }

      const lineDiscount = getSafeNumber(expenseLine.discount);

      if (lineDiscount < 0 || lineDiscount > lineAmount) {
        throw new Error(
          `${lineNumber}. gider satırındaki indirim tutarı geçersizdir.`,
        );
      }

      const selectedProduct =
        products.find((product) => product.id === expenseLine.productId) ??
        null;

      const selectedBrand =
        brands.find((brand) => brand.id === expenseLine.brandId) ?? null;

      const isFuelProduct =
        selectedProduct?.productType === "fuel" ||
        expenseLine.productType === "fuel";

      if (isFuelProduct) {
        const liters = getSafeNumber(expenseLine.liters);

        const fuelUnitPrice = getSafeNumber(expenseLine.fuelUnitPrice);

        if (liters <= 0) {
          throw new Error(
            `${lineNumber}. yakıt satırındaki litre miktarı sıfırdan büyük olmalıdır.`,
          );
        }

        if (fuelUnitPrice <= 0) {
          throw new Error(
            `${lineNumber}. yakıt satırındaki litre fiyatı sıfırdan büyük olmalıdır.`,
          );
        }

        const expectedFuelTotalMinor = calculateFuelTotalMinor(
          expenseLine.liters,
          expenseLine.fuelUnitPrice,
        );

        const enteredFuelTotalMinor = convertInputAmountToMinor(
          expenseLine.amount,
        );

        if (
          Math.abs(expectedFuelTotalMinor - enteredFuelTotalMinor) >
          FUEL_TOTAL_TOLERANCE_MINOR
        ) {
          throw new Error(
            `${lineNumber}. yakıt satırının toplamı ${formatAmount(
              expectedFuelTotalMinor,
            )} ₺ olmalıdır.`,
          );
        }
      }

      return {
        id: expenseLine.id,

        categoryId: selectedLineCategory.id,

        category: selectedLineCategory.name,

        categoryPath: selectedLineCategory.pathNames.join(" > "),

        categoryPathIds: selectedLineCategory.pathIds,

        categoryType: selectedLineCategory.categoryType,

        productId: selectedProduct?.id ?? "",

        productName: selectedProduct?.name ?? "",

        productType: isFuelProduct ? "fuel" : "standard",

        brandId: selectedBrand?.id ?? selectedProduct?.brandId ?? "",

        brandName: selectedBrand?.name ?? selectedProduct?.brandName ?? "",

        purchaseQuantity: isFuelProduct
          ? "1"
          : expenseLine.purchaseQuantity || "1",

        unitCount: isFuelProduct ? "1" : expenseLine.unitCount || "1",

        unitSize: isFuelProduct ? "1" : expenseLine.unitSize || "1",

        unitType: isFuelProduct ? "l" : expenseLine.unitType || "adet",

        unitPrice: isFuelProduct
          ? expenseLine.fuelUnitPrice
          : expenseLine.unitPrice,

        fuelType: isFuelProduct
          ? expenseLine.fuelType || selectedProduct?.fuelType || "other"
          : "",

        liters: isFuelProduct ? expenseLine.liters : "",

        fuelUnitPrice: isFuelProduct ? expenseLine.fuelUnitPrice : "",

        vehicleId: isFuelProduct ? expenseLine.vehicleId : "",

        odometer: isFuelProduct ? expenseLine.odometer : "",

        amount: expenseLine.amount,

        discount: expenseLine.discount || "0",

        note: expenseLine.note?.trim() ?? "",
      };
    });
  };

  const handleAddTransaction = async (event) => {
    event.preventDefault();

    setTransactionFormError("");

    if (!currentUser?.id) {
      setTransactionFormError(
        "İşlem oluşturmak için kullanıcı oturumu bulunamadı.",
      );

      return;
    }

    if (!transactionDate) {
      setTransactionFormError("İşlem tarihi seçilmelidir.");

      return;
    }

    let transactionPayload;

    try {
      if (transactionType === "Gelir") {
        const selectedTransactionCategory = activeCategories.find(
          (category) => category.id === categoryId,
        );

        if (!selectedTransactionCategory) {
          throw new Error("Gelir kategorisi seçmelisiniz.");
        }

        if (getSafeNumber(amount) <= 0) {
          throw new Error("Gelir tutarı sıfırdan büyük olmalıdır.");
        }

        transactionPayload = {
          userId: currentUser.id,

          transactionType,

          categoryId: selectedTransactionCategory.id,

          category: selectedTransactionCategory.name,

          categoryPath: selectedTransactionCategory.pathNames.join(" > "),

          categoryPathIds: selectedTransactionCategory.pathIds,

          categoryType: selectedTransactionCategory.categoryType,

          amount,

          lines: [],

          transactionDiscount: "",

          couponCode: "",

          description,

          paymentMethod,

          creditCardId: "",

          creditCardName: "",

          installmentType: "none",

          installmentCount: 0,

          transactionDate,

          merchantId: "",

          merchantName: "",

          branchId: "",

          branchName: "",
        };
      } else {
        if (transactionCategoryOptions.length === 0) {
          throw new Error(
            "Gider kategorisi bulunmuyor. Önce gider türünde bir kategori oluşturunuz.",
          );
        }

        if (paymentMethod === "Kredi Kartı" && !selectedCreditCard) {
          throw new Error(
            "Kredi kartıyla yapılan gider için kart seçmelisiniz.",
          );
        }

        // 11.GÜN - Taksitli kredi kartı giderinde taksit sayısı form seviyesinde kontrol edilir.
        if (
          paymentMethod === "Kredi Kartı" &&
          installmentType === "installment"
        ) {
          const numericInstallmentCount = Number(installmentCount);

          if (
            !Number.isInteger(numericInstallmentCount) ||
            numericInstallmentCount < 2 ||
            numericInstallmentCount > 36
          ) {
            throw new Error("Taksit sayısı 2 ile 36 arasında olmalıdır.");
          }
        }

        const preparedExpenseLines = prepareExpenseLines();

        const totalAfterLineDiscountMinor =
          expenseTotals.subtotalMinor - expenseTotals.lineDiscountTotalMinor;

        if (
          expenseTotals.transactionDiscountMinor > totalAfterLineDiscountMinor
        ) {
          throw new Error(
            "Genel indirim, satır indirimleri sonrasındaki tutardan büyük olamaz.",
          );
        }

        if (expenseTotals.netTotalMinor <= 0) {
          throw new Error("Gider toplamı sıfırdan büyük olmalıdır.");
        }

        const firstLineCategory = activeCategories.find(
          (category) => category.id === preparedExpenseLines[0].categoryId,
        );

        const selectedBranch =
          merchantBranches.find((branch) => branch.id === branchId) ?? null;

        transactionPayload = {
          userId: currentUser.id,

          transactionType,

          categoryId: firstLineCategory?.id ?? "",

          category: firstLineCategory?.name ?? "Gider",

          categoryPath: firstLineCategory?.pathNames.join(" > ") ?? "Gider",

          categoryPathIds: firstLineCategory?.pathIds ?? [],

          categoryType: firstLineCategory?.categoryType ?? "expense",

          // 8.GÜN - Gider toplamı kullanıcıdan tekrar alınmadan gider satırları ve indirimlerden hesaplanır.
          amount: (expenseTotals.netTotalMinor / 100).toFixed(2),

          lines: preparedExpenseLines,

          transactionDiscount,

          couponCode,

          description,

          paymentMethod,

          creditCardId: selectedCreditCard?.id ?? "",

          creditCardName: selectedCreditCard?.name ?? "",

          // 11.GÜN - Kredi kartı giderinde seçilen ödeme şekli ana transaction kaydına gönderilir.
          installmentType:
            paymentMethod === "Kredi Kartı" ? installmentType : "none",

          // 11.GÜN - Tek çekimde bir, taksitli işlemde seçilen taksit sayısı repository katmanına iletilir.
          installmentCount:
            paymentMethod === "Kredi Kartı"
              ? installmentType === "installment"
                ? Number(installmentCount)
                : 1
              : 0,

          transactionDate,

          merchantId: selectedMerchant?.id ?? "",

          merchantName: selectedMerchant?.name ?? "",

          branchId: selectedBranch?.id ?? "",

          branchName: selectedBranch?.name ?? "",
        };
      }
    } catch (error) {
      setTransactionFormError(error.message || "Finansal kayıt hazırlanamadı.");

      return;
    }

    const result = await dispatch(addTransaction(transactionPayload));

    if (addTransaction.fulfilled.match(result)) {
      resetTransactionForm();

      return;
    }

    if (addTransaction.rejected.match(result)) {
      setTransactionFormError(
        result.payload ?? "Finansal kayıt oluşturulamadı.",
      );
    }
  };

  return (
    <>
      <form className="transaction-form" onSubmit={handleAddTransaction}>
        <h2 className="section-title">Yeni Finansal Kayıt</h2>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="transactionType">
              İşlem Türü *
            </label>

            <select
              id="transactionType"
              className="form-input"
              value={transactionType}
              onChange={handleTransactionTypeChange}
              disabled={isSaving}
              required
            >
              <option value="Gelir">Gelir</option>

              <option value="Gider">Gider</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="transactionDate">
              İşlem Tarihi *
            </label>

            <input
              id="transactionDate"
              className="form-input"
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="paymentMethod">
              Ödeme Yöntemi *
            </label>

            <select
              id="paymentMethod"
              className="form-input"
              value={paymentMethod}
              onChange={handlePaymentMethodChange}
              disabled={isSaving}
              required
            >
              <option value="Nakit">Nakit</option>

              <option value="Banka Hesabı">Banka Hesabı</option>

              <option value="Banka Kartı">Banka Kartı</option>

              <option value="Kredi Kartı">Kredi Kartı</option>

              <option value="Dijital Cüzdan">Dijital Cüzdan</option>

              <option value="Havale / EFT">Havale / EFT</option>

              <option value="Diğer">Diğer</option>
            </select>
          </div>
        </div>

        {transactionType === "Gider" && paymentMethod === "Kredi Kartı" && (
          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="transactionCreditCard">
                Kullanılan Kredi Kartı *
              </label>

              <select
                id="transactionCreditCard"
                className="form-input"
                value={selectedCreditCardId}
                onChange={(event) =>
                  setSelectedCreditCardId(event.target.value)
                }
                disabled={isSaving}
                required
              >
                <option value="">Kredi kartı seçiniz</option>

                {activeCreditCards.map((creditCard) => (
                  <option key={creditCard.id} value={creditCard.id}>
                    {creditCard.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 11.GÜN - Kullanıcıya tek çekim veya taksitli ödeme seçeneği gösterilir. */}
            <div>
              <label className="form-label" htmlFor="installmentType">
                Ödeme Şekli *
              </label>

              <select
                id="installmentType"
                className="form-input"
                value={installmentType}
                onChange={handleInstallmentTypeChange}
                disabled={isSaving}
              >
                <option value="single">Tek Çekim</option>

                <option value="installment">Taksitli</option>
              </select>
            </div>

            {installmentType === "installment" && (
              <div>
                <label className="form-label" htmlFor="installmentCount">
                  Taksit Sayısı *
                </label>

                <input
                  id="installmentCount"
                  className="form-input"
                  type="number"
                  min="2"
                  max="36"
                  step="1"
                  value={installmentCount}
                  onChange={(event) => setInstallmentCount(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="transactionDescription">
            Genel Açıklama
          </label>

          <textarea
            id="transactionDescription"
            className="form-input"
            rows="3"
            maxLength="500"
            placeholder="İşlem hakkında isteğe bağlı açıklama"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSaving}
          />
        </div>

        {transactionType === "Gelir" ? (
          <div className="form-row">
            <div>
              <label className="form-label" htmlFor="transactionCategory">
                Gelir Kategorisi *
              </label>

              <select
                id="transactionCategory"
                className="form-input"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={isSaving}
                required
              >
                <option value="">Gelir kategorisi seçiniz</option>

                {transactionCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.pathNames.join(" > ")}
                  </option>
                ))}
              </select>

              {transactionCategoryOptions.length === 0 && (
                <p className="form-error">
                  Gelir kategorisi bulunmuyor. Önce gelir türünde bir kategori
                  oluşturunuz.
                </p>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="transactionAmount">
                Gelir Tutarı *
              </label>

              <input
                id="transactionAmount"
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isSaving}
                required
              />
            </div>
          </div>
        ) : (
          <ExpenseForm
            merchantId={merchantId}
            setMerchantId={setMerchantId}
            merchants={merchants}
            branchId={branchId}
            setBranchId={setBranchId}
            merchantBranches={merchantBranches}
            expenseLines={expenseLines}
            transactionCategoryOptions={transactionCategoryOptions}
            categoryLoadStatus={categoryLoadStatus}
            products={products}
            brands={brands}
            handleExpenseLineChange={handleExpenseLineChange}
            handleRemoveExpenseLine={handleRemoveExpenseLine}
            handleAddExpenseLine={handleAddExpenseLine}
            transactionDiscount={transactionDiscount}
            setTransactionDiscount={setTransactionDiscount}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            expenseTotals={expenseTotals}
            formatAmount={formatAmount}
          />
        )}

        {transactionFormError && (
          <p className="form-error" role="alert">
            {transactionFormError}
          </p>
        )}

        <button
          className="add-button"
          type="submit"
          disabled={isSaving || transactionCategoryOptions.length === 0}
        >
          {isSaving ? "Kayıt Ekleniyor..." : "Finansal Kaydı Ekle"}
        </button>
      </form>
    </>
  );
}

export default TransactionForm;
