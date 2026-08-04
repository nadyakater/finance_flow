import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { addTransaction } from "../../application/transactionThunks";

import {
  selectTransactionSaveStatus,
} from "../transactionSelectors";

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

import { selectCurrentUser } from "../../../auth/presentation/authSelectors";

import ExpenseForm from "./ExpenseForm";

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

// =====================================================
// 3.GÜN - 6.GÜN
// Gelir ve gider kayıt formunun presentation bileşeni.
//
// PDF mimarisine göre:
// - Yalnızca bu formu ilgilendiren geçici state burada tutulur.
// - Kalıcı kategori ve katalog verileri Redux selectorlarından alınır.
// - Firebase'e doğrudan erişilmez.
// - Kayıt işlemi application katmanındaki thunk üzerinden yapılır.
// =====================================================

function TransactionForm({
  getTodayDateValue,
  convertInputAmountToMinor,
  formatAmount,
}) {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);
  const transactionSaveStatus = useSelector(selectTransactionSaveStatus);

  const activeCategories = useSelector(selectActiveCategories);
  const categoryLoadStatus = useSelector(selectCategoryLoadStatus);

  const merchants = useSelector(selectMerchants);
  const branches = useSelector(selectBranches);
  const brands = useSelector(selectBrands);
  const products = useSelector(selectProducts);

  const [transactionType, setTransactionType] = useState("Gelir");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayDateValue());
  const [paymentMethod, setPaymentMethod] = useState("Nakit");

  const [expenseLines, setExpenseLines] = useState([
    createEmptyExpenseLine(1),
  ]);

  const [nextExpenseLineId, setNextExpenseLineId] = useState(2);
  const [receiptTotal, setReceiptTotal] = useState("");
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
  }, [
    convertInputAmountToMinor,
    expenseLines,
    transactionDiscount,
  ]);

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

  const handleTransactionTypeChange = (event) => {
    setTransactionType(event.target.value);
    setCategoryId("");
    setTransactionFormError("");
  };

  const handleAddExpenseLine = () => {
    setExpenseLines((currentLines) => [
      ...currentLines,
      createEmptyExpenseLine(nextExpenseLineId),
    ]);

    setNextExpenseLineId((currentId) => currentId + 1);
  };

  const handleRemoveExpenseLine = (lineId) => {
    setExpenseLines((currentLines) =>
      currentLines.filter((line) => line.id !== lineId),
    );

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
          `Fiş toplamı ${formatAmount(
            expenseTotals.netTotalMinor,
          )} ₺ olmalıdır. Satır, indirim ve fiş toplamlarını kontrol ediniz.`,
        );
        return;
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
        amount: receiptTotal,
        lines: preparedExpenseLines,
        transactionDiscount,
        couponCode,
        paymentMethod,
        transactionDate,
        merchantId: selectedMerchant?.id ?? "",
        merchantName: selectedMerchant?.name ?? "",
        branchId: selectedBranch?.id ?? "",
        branchName: selectedBranch?.name ?? "",
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

  return (
    <>
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
            receiptTotal={receiptTotal}
            setReceiptTotal={setReceiptTotal}
            expenseTotals={expenseTotals}
            formatAmount={formatAmount}
          />
        )}

        <button className="add-button" type="submit" disabled={isSaving}>
          {isSaving ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>

      {transactionFormError && (
        <p className="form-error">{transactionFormError}</p>
      )}
    </>
  );
}

export default TransactionForm;