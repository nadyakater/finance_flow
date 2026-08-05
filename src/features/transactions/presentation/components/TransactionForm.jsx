import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  addTransaction,
} from "../../application/transactionThunks";

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

import {
  selectCurrentUser,
} from "../../../auth/presentation/authSelectors";

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
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const normalizedValue =
    typeof value === "string"
      ? value.replace(",", ".")
      : value;

  const numericValue =
    Number(normalizedValue);

  return Number.isFinite(
    numericValue,
  )
    ? numericValue
    : 0;
}

function calculateFuelTotalMinor(
  liters,
  fuelUnitPrice,
) {
  const numericLiters =
    getSafeNumber(liters);

  const numericUnitPrice =
    getSafeNumber(
      fuelUnitPrice,
    );

  if (
    numericLiters <= 0 ||
    numericUnitPrice <= 0
  ) {
    return 0;
  }

  return Math.round(
    numericLiters *
      numericUnitPrice *
      100,
  );
}

// =====================================================
// 7.GÜN
// Gelir ve çok satırlı gider kayıt formu.
//
// Kalıcı veriler Redux üzerinden alınır.
// Firebase'e doğrudan erişilmez.
//
// 8.GÜN
// Yakıt ürünleri için yakıt türü, litre, litre fiyatı,
// araç ve odometre alanları eklendi.
// Litre × litre fiyatı ile satır toplamı doğrulanır.
//
// Fiş/fatura dosyası yükleme özelliği kaldırıldı.
// =====================================================

function TransactionForm({
  getTodayDateValue,
  convertInputAmountToMinor,
  formatAmount,
}) {
  const dispatch =
    useDispatch();

  const currentUser =
    useSelector(
      selectCurrentUser,
    );

  const transactionSaveStatus =
    useSelector(
      selectTransactionSaveStatus,
    );

  const activeCategories =
    useSelector(
      selectActiveCategories,
    );

  const categoryLoadStatus =
    useSelector(
      selectCategoryLoadStatus,
    );

  const merchants =
    useSelector(
      selectMerchants,
    );

  const branches =
    useSelector(
      selectBranches,
    );

  const brands =
    useSelector(
      selectBrands,
    );

  const products =
    useSelector(
      selectProducts,
    );

  const [
    transactionType,
    setTransactionType,
  ] = useState("Gelir");

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    transactionDate,
    setTransactionDate,
  ] = useState(
    getTodayDateValue(),
  );

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("Nakit");

  const [
    expenseLines,
    setExpenseLines,
  ] = useState([
    createEmptyExpenseLine(1),
  ]);

  const [
    nextExpenseLineId,
    setNextExpenseLineId,
  ] = useState(2);

  const [
    receiptTotal,
    setReceiptTotal,
  ] = useState("");

  const [
    transactionDiscount,
    setTransactionDiscount,
  ] = useState("");

  const [
    couponCode,
    setCouponCode,
  ] = useState("");

  const [
    merchantId,
    setMerchantId,
  ] = useState("");

  const [
    branchId,
    setBranchId,
  ] = useState("");

  const [
    transactionFormError,
    setTransactionFormError,
  ] = useState("");

  const isSaving =
    transactionSaveStatus ===
    "loading";

  const selectedMerchant =
    useMemo(
      () =>
        merchants.find(
          (merchant) =>
            merchant.id ===
            merchantId,
        ) ?? null,
      [
        merchantId,
        merchants,
      ],
    );

  const merchantBranches =
    useMemo(
      () =>
        branches.filter(
          (branch) =>
            branch.merchantId ===
            merchantId,
        ),
      [
        branches,
        merchantId,
      ],
    );

  const transactionCategoryOptions =
    useMemo(() => {
      const expectedCategoryType =
        transactionType === "Gelir"
          ? "income"
          : "expense";

      return activeCategories.filter(
        (category) =>
          category.isSelectable &&
          (
            category.categoryType ===
              expectedCategoryType ||
            category.categoryType ===
              "both"
          ),
      );
    }, [
      activeCategories,
      transactionType,
    ]);

  const expenseTotals =
    useMemo(() => {
      const subtotalMinor =
        expenseLines.reduce(
          (total, line) =>
            total +
            Math.max(
              convertInputAmountToMinor(
                line.amount,
              ),
              0,
            ),
          0,
        );

      const lineDiscountTotalMinor =
        expenseLines.reduce(
          (total, line) =>
            total +
            Math.max(
              convertInputAmountToMinor(
                line.discount,
              ),
              0,
            ),
          0,
        );

      const transactionDiscountMinor =
        Math.max(
          convertInputAmountToMinor(
            transactionDiscount,
          ),
          0,
        );

      return {
        subtotalMinor,

        lineDiscountTotalMinor,

        transactionDiscountMinor,

        netTotalMinor:
          Math.max(
            subtotalMinor -
              lineDiscountTotalMinor -
              transactionDiscountMinor,
            0,
          ),
      };
    }, [
      convertInputAmountToMinor,
      expenseLines,
      transactionDiscount,
    ]);

  useEffect(() => {
    if (
      transactionType !== "Gelir"
    ) {
      setCategoryId("");
      return;
    }

    const selectedCategoryExists =
      transactionCategoryOptions.some(
        (category) =>
          category.id ===
          categoryId,
      );

    if (
      !selectedCategoryExists
    ) {
      setCategoryId(
        transactionCategoryOptions[0]
          ?.id ?? "",
      );
    }
  }, [
    categoryId,
    transactionCategoryOptions,
    transactionType,
  ]);

  useEffect(() => {
    if (
      transactionType !== "Gider"
    ) {
      return;
    }

    const availableCategoryIds =
      new Set(
        transactionCategoryOptions.map(
          (category) =>
            category.id,
        ),
      );

    const defaultCategoryId =
      transactionCategoryOptions[0]
        ?.id ?? "";

    setExpenseLines(
      (currentLines) => {
        const requiresUpdate =
          currentLines.some(
            (line) =>
              !line.categoryId ||
              !availableCategoryIds.has(
                line.categoryId,
              ),
          );

        if (!requiresUpdate) {
          return currentLines;
        }

        return currentLines.map(
          (line) =>
            availableCategoryIds.has(
              line.categoryId,
            )
              ? line
              : {
                  ...line,

                  categoryId:
                    defaultCategoryId,
                },
        );
      },
    );
  }, [
    transactionCategoryOptions,
    transactionType,
  ]);

  useEffect(() => {
    const selectedBranchIsValid =
      merchantBranches.some(
        (branch) =>
          branch.id === branchId,
      );

    if (
      branchId &&
      !selectedBranchIsValid
    ) {
      setBranchId("");
    }
  }, [
    branchId,
    merchantBranches,
  ]);

  const resetTransactionForm =
    () => {
      setTransactionType(
        "Gelir",
      );

      setCategoryId("");

      setAmount("");

      setDescription("");

      setTransactionDate(
        getTodayDateValue(),
      );

      setPaymentMethod(
        "Nakit",
      );

      setExpenseLines([
        createEmptyExpenseLine(1),
      ]);

      setNextExpenseLineId(2);

      setReceiptTotal("");

      setTransactionDiscount("");

      setCouponCode("");

      setMerchantId("");

      setBranchId("");

      setTransactionFormError("");
    };

  const handleTransactionTypeChange =
    (event) => {
      const selectedTransactionType =
        event.target.value;

      setTransactionType(
        selectedTransactionType,
      );

      setCategoryId("");

      setTransactionFormError("");

      if (
        selectedTransactionType ===
        "Gelir"
      ) {
        setReceiptTotal("");

        setTransactionDiscount("");

        setCouponCode("");

        setMerchantId("");

        setBranchId("");

        setExpenseLines([
          createEmptyExpenseLine(1),
        ]);

        setNextExpenseLineId(2);
      }
    };

  const handleAddExpenseLine =
    () => {
      setExpenseLines(
        (currentLines) => [
          ...currentLines,

          createEmptyExpenseLine(
            nextExpenseLineId,
          ),
        ],
      );

      setNextExpenseLineId(
        (currentId) =>
          currentId + 1,
      );

      setTransactionFormError("");
    };

  const handleRemoveExpenseLine =
    (lineId) => {
      setExpenseLines(
        (currentLines) => {
          if (
            currentLines.length === 1
          ) {
            return currentLines;
          }

          return currentLines.filter(
            (line) =>
              line.id !== lineId,
          );
        },
      );

      setTransactionFormError("");
    };

  const handleExpenseLineChange =
    (
      lineId,
      fieldName,
      value,
    ) => {
      setExpenseLines(
        (currentLines) =>
          currentLines.map(
            (line) => {
              if (
                line.id !== lineId
              ) {
                return line;
              }

              if (
                fieldName ===
                "productId"
              ) {
                const selectedProduct =
                  products.find(
                    (product) =>
                      product.id ===
                      value,
                  );

                if (
                  !selectedProduct
                ) {
                  return {
                    ...line,

                    productId: "",

                    productType:
                      "standard",

                    brandId: "",

                    purchaseQuantity:
                      "1",

                    unitCount: "1",

                    unitSize: "1",

                    unitType:
                      "adet",

                    unitPrice: "",

                    fuelType:
                      "gasoline",

                    liters: "",

                    fuelUnitPrice:
                      "",

                    vehicleId: "",

                    odometer: "",

                    amount: "",
                  };
                }

                const selectedProductType =
                  selectedProduct.productType ===
                  "fuel"
                    ? "fuel"
                    : "standard";

                if (
                  selectedProductType ===
                  "fuel"
                ) {
                  return {
                    ...line,

                    productId:
                      selectedProduct.id,

                    productType:
                      "fuel",

                    brandId:
                      selectedProduct.brandId ??
                      "",

                    fuelType:
                      selectedProduct.fuelType ||
                      "gasoline",

                    liters: "",

                    fuelUnitPrice:
                      "",

                    vehicleId: "",

                    odometer: "",

                    purchaseQuantity:
                      "1",

                    unitCount: "1",

                    unitSize: "1",

                    unitType: "l",

                    unitPrice: "",

                    amount: "",
                  };
                }

                return {
                  ...line,

                  productId:
                    selectedProduct.id,

                  productType:
                    "standard",

                  brandId:
                    selectedProduct.brandId ??
                    "",

                  purchaseQuantity:
                    "1",

                  unitCount:
                    selectedProduct.unitCount !==
                    undefined
                      ? String(
                          selectedProduct.unitCount,
                        )
                      : "1",

                  unitSize:
                    selectedProduct.unitSize !==
                    undefined
                      ? String(
                          selectedProduct.unitSize,
                        )
                      : "1",

                  unitType:
                    selectedProduct.unitType ??
                    "adet",

                  unitPrice: "",

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
                updatedLine.productType ===
                  "fuel" &&
                (
                  fieldName ===
                    "liters" ||
                  fieldName ===
                    "fuelUnitPrice"
                )
              ) {
                const fuelTotalMinor =
                  calculateFuelTotalMinor(
                    updatedLine.liters,
                    updatedLine.fuelUnitPrice,
                  );

                updatedLine.amount =
                  fuelTotalMinor > 0
                    ? (
                        fuelTotalMinor /
                        100
                      ).toFixed(2)
                    : "";
              }

              return updatedLine;
            },
          ),
      );

      setTransactionFormError("");
    };

  const prepareExpenseLines =
    () => {
      const preparedExpenseLines =
        [];

      for (
        let index = 0;
        index < expenseLines.length;
        index += 1
      ) {
        const expenseLine =
          expenseLines[index];

        const selectedLineCategory =
          activeCategories.find(
            (category) =>
              category.id ===
              expenseLine.categoryId,
          );

        if (
          !selectedLineCategory
        ) {
          throw new Error(
            `${index + 1}. gider satırı için kategori seçiniz.`,
          );
        }

        const lineAmount =
          getSafeNumber(
            expenseLine.amount,
          );

        const lineDiscount =
          getSafeNumber(
            expenseLine.discount,
          );

        if (
          lineAmount <= 0
        ) {
          throw new Error(
            `${index + 1}. gider satırının tutarı sıfırdan büyük olmalıdır.`,
          );
        }

        if (
          lineDiscount < 0 ||
          lineDiscount >
            lineAmount
        ) {
          throw new Error(
            `${index + 1}. gider satırındaki indirim tutarı geçersizdir.`,
          );
        }

        const selectedProduct =
          products.find(
            (product) =>
              product.id ===
              expenseLine.productId,
          );

        const selectedBrand =
          brands.find(
            (brand) =>
              brand.id ===
              expenseLine.brandId,
          );

        const isFuelProduct =
          selectedProduct?.productType ===
            "fuel" ||
          expenseLine.productType ===
            "fuel";

        if (
          expenseLine.productId &&
          !isFuelProduct
        ) {
          if (
            getSafeNumber(
              expenseLine.purchaseQuantity,
            ) <= 0
          ) {
            throw new Error(
              `${index + 1}. gider satırındaki satın alınan miktar geçersizdir.`,
            );
          }

          if (
            getSafeNumber(
              expenseLine.unitCount,
            ) <= 0
          ) {
            throw new Error(
              `${index + 1}. gider satırındaki paket içi adet geçersizdir.`,
            );
          }

          if (
            getSafeNumber(
              expenseLine.unitSize,
            ) <= 0
          ) {
            throw new Error(
              `${index + 1}. gider satırındaki ürün miktarı geçersizdir.`,
            );
          }
        }

        if (isFuelProduct) {
          const liters =
            getSafeNumber(
              expenseLine.liters,
            );

          const fuelUnitPrice =
            getSafeNumber(
              expenseLine.fuelUnitPrice,
            );

          if (liters <= 0) {
            throw new Error(
              `${index + 1}. yakıt satırındaki litre miktarı sıfırdan büyük olmalıdır.`,
            );
          }

          if (
            fuelUnitPrice <= 0
          ) {
            throw new Error(
              `${index + 1}. yakıt satırındaki litre fiyatı sıfırdan büyük olmalıdır.`,
            );
          }

          if (
            !expenseLine.fuelType
          ) {
            throw new Error(
              `${index + 1}. yakıt satırı için yakıt türünü seçiniz.`,
            );
          }

          const expectedFuelTotalMinor =
            calculateFuelTotalMinor(
              expenseLine.liters,
              expenseLine.fuelUnitPrice,
            );

          const enteredFuelTotalMinor =
            convertInputAmountToMinor(
              expenseLine.amount,
            );

          const differenceMinor =
            Math.abs(
              expectedFuelTotalMinor -
                enteredFuelTotalMinor,
            );

          if (
            differenceMinor >
            FUEL_TOTAL_TOLERANCE_MINOR
          ) {
            throw new Error(
              `${index + 1}. yakıt satırının toplamı ${formatAmount(
                expectedFuelTotalMinor,
              )} ₺ olmalıdır. Litre ile litre fiyatını kontrol ediniz.`,
            );
          }
        }

        preparedExpenseLines.push({
          id:
            expenseLine.id,

          categoryId:
            selectedLineCategory.id,

          category:
            selectedLineCategory.name,

          categoryPath:
            selectedLineCategory.pathNames.join(
              " > ",
            ),

          categoryPathIds:
            selectedLineCategory.pathIds,

          categoryType:
            selectedLineCategory.categoryType,

          productId:
            selectedProduct?.id ??
            "",

          productName:
            selectedProduct?.name ??
            "",

          productType:
            isFuelProduct
              ? "fuel"
              : "standard",

          brandId:
            selectedBrand?.id ??
            selectedProduct?.brandId ??
            "",

          brandName:
            selectedBrand?.name ??
            selectedProduct?.brandName ??
            "",

          purchaseQuantity:
            isFuelProduct
              ? expenseLine.liters
              : expenseLine.productId
                ? expenseLine.purchaseQuantity
                : "",

          unitCount:
            isFuelProduct
              ? "1"
              : expenseLine.productId
                ? expenseLine.unitCount
                : "",

          unitSize:
            isFuelProduct
              ? "1"
              : expenseLine.productId
                ? expenseLine.unitSize
                : "",

          unitType:
            isFuelProduct
              ? "l"
              : expenseLine.productId
                ? expenseLine.unitType
                : "adet",

          unitPrice:
            isFuelProduct
              ? expenseLine.fuelUnitPrice
              : expenseLine.productId
                ? expenseLine.unitPrice
                : "",

          fuelType:
            isFuelProduct
              ? expenseLine.fuelType ||
                selectedProduct?.fuelType ||
                "other"
              : "",

          liters:
            isFuelProduct
              ? expenseLine.liters
              : "",

          fuelUnitPrice:
            isFuelProduct
              ? expenseLine.fuelUnitPrice
              : "",

          vehicleId:
            isFuelProduct
              ? expenseLine.vehicleId
              : "",

          odometer:
            isFuelProduct
              ? expenseLine.odometer
              : "",

          amount:
            expenseLine.amount,

          discount:
            expenseLine.discount ||
            0,

          note:
            expenseLine.note,
        });
      }

      return preparedExpenseLines;
    };

  const handleAddTransaction =
    async (event) => {
      event.preventDefault();

      setTransactionFormError("");

      if (
        !currentUser?.id
      ) {
        setTransactionFormError(
          "İşlem oluşturmak için kullanıcı oturumu bulunamadı.",
        );

        return;
      }

      if (
        !transactionDate
      ) {
        setTransactionFormError(
          "İşlem tarihi zorunludur.",
        );

        return;
      }

      if (
        !paymentMethod
      ) {
        setTransactionFormError(
          "Ödeme yöntemi seçilmelidir.",
        );

        return;
      }

      let transactionPayload;

      try {
        if (
          transactionType ===
          "Gelir"
        ) {
          if (
            getSafeNumber(amount) <=
            0
          ) {
            throw new Error(
              "Gelir tutarı sıfırdan büyük olmalıdır.",
            );
          }

          const selectedTransactionCategory =
            activeCategories.find(
              (category) =>
                category.id ===
                categoryId,
            );

          if (
            !selectedTransactionCategory
          ) {
            throw new Error(
              "Gelir kategorisi seçmelisiniz.",
            );
          }

          transactionPayload = {
            userId:
              currentUser.id,

            transactionType,

            categoryId:
              selectedTransactionCategory.id,

            category:
              selectedTransactionCategory.name,

            categoryPath:
              selectedTransactionCategory.pathNames.join(
                " > ",
              ),

            categoryPathIds:
              selectedTransactionCategory.pathIds,

            categoryType:
              selectedTransactionCategory.categoryType,

            amount,

            lines: [],

            transactionDiscount:
              "",

            couponCode: "",

            description,

            paymentMethod,

            transactionDate,

            merchantId: "",

            merchantName: "",

            branchId: "",

            branchName: "",
          };
        } else {
          if (
            transactionCategoryOptions.length ===
            0
          ) {
            throw new Error(
              "Gider kategorisi bulunmuyor. Önce gider türünde bir kategori oluşturunuz.",
            );
          }

          const preparedExpenseLines =
            prepareExpenseLines();

          const totalAfterLineDiscountMinor =
            expenseTotals.subtotalMinor -
            expenseTotals.lineDiscountTotalMinor;

          if (
            expenseTotals.transactionDiscountMinor >
            totalAfterLineDiscountMinor
          ) {
            throw new Error(
              "Genel indirim, satır indirimleri sonrasındaki tutardan büyük olamaz.",
            );
          }

          if (
            expenseTotals.netTotalMinor <=
            0
          ) {
            throw new Error(
              "Giderin net toplamı sıfırdan büyük olmalıdır.",
            );
          }

          const receiptTotalMinor =
            convertInputAmountToMinor(
              receiptTotal,
            );

          if (
            receiptTotalMinor <=
            0
          ) {
            throw new Error(
              "Fiş toplamı sıfırdan büyük olmalıdır.",
            );
          }

          if (
            receiptTotalMinor !==
            expenseTotals.netTotalMinor
          ) {
            throw new Error(
              `Fiş toplamı ${formatAmount(
                expenseTotals.netTotalMinor,
              )} ₺ olmalıdır. Satır ve indirim tutarlarını kontrol ediniz.`,
            );
          }

          const firstLineCategory =
            activeCategories.find(
              (category) =>
                category.id ===
                preparedExpenseLines[0]
                  .categoryId,
            );

          const selectedBranch =
            merchantBranches.find(
              (branch) =>
                branch.id ===
                branchId,
            ) ?? null;

          transactionPayload = {
            userId:
              currentUser.id,

            transactionType,

            categoryId:
              firstLineCategory?.id ??
              "",

            category:
              firstLineCategory?.name ??
              "Gider",

            categoryPath:
              firstLineCategory?.pathNames.join(
                " > ",
              ) ?? "Gider",

            categoryPathIds:
              firstLineCategory?.pathIds ??
              [],

            categoryType:
              firstLineCategory?.categoryType ??
              "expense",

            amount:
              receiptTotal,

            lines:
              preparedExpenseLines,

            transactionDiscount,

            couponCode,

            description,

            paymentMethod,

            transactionDate,

            merchantId:
              selectedMerchant?.id ??
              "",

            merchantName:
              selectedMerchant?.name ??
              "",

            branchId:
              selectedBranch?.id ??
              "",

            branchName:
              selectedBranch?.name ??
              "",
          };
        }
      } catch (error) {
        setTransactionFormError(
          error.message,
        );

        return;
      }

      const result =
        await dispatch(
          addTransaction(
            transactionPayload,
          ),
        );

      if (
        addTransaction.fulfilled.match(
          result,
        )
      ) {
        resetTransactionForm();
        return;
      }

      if (
        addTransaction.rejected.match(
          result,
        )
      ) {
        setTransactionFormError(
          result.payload ??
            "Finansal kayıt oluşturulamadı.",
        );
      }
    };

  return (
    <>
      <form
        className="transaction-form"
        onSubmit={
          handleAddTransaction
        }
      >
        <h2 className="section-title">
          Yeni Finansal Kayıt
        </h2>

        <div className="form-row">
          <div>
            <label
              className="form-label"
              htmlFor="transactionType"
            >
              İşlem Türü *
            </label>

            <select
              id="transactionType"
              className="form-input"
              value={
                transactionType
              }
              onChange={
                handleTransactionTypeChange
              }
              disabled={isSaving}
            >
              <option value="Gelir">
                Gelir
              </option>

              <option value="Gider">
                Gider
              </option>
            </select>
          </div>

          <div>
            <label
              className="form-label"
              htmlFor="transactionDate"
            >
              İşlem Tarihi *
            </label>

            <input
              id="transactionDate"
              className="form-input"
              type="date"
              value={
                transactionDate
              }
              onChange={(event) =>
                setTransactionDate(
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
              htmlFor="paymentMethod"
            >
              Ödeme Yöntemi *
            </label>

            <select
              id="paymentMethod"
              className="form-input"
              value={
                paymentMethod
              }
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value,
                )
              }
              disabled={isSaving}
              required
            >
              <option value="Nakit">
                Nakit
              </option>

              <option value="Banka Hesabı">
                Banka Hesabı
              </option>

              <option value="Banka Kartı">
                Banka Kartı
              </option>

              <option value="Kredi Kartı">
                Kredi Kartı
              </option>

              <option value="Dijital Cüzdan">
                Dijital Cüzdan
              </option>

              <option value="Diğer">
                Diğer
              </option>
            </select>
          </div>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor="transactionDescription"
          >
            Genel Açıklama
          </label>

          <textarea
            id="transactionDescription"
            className="form-input"
            rows="3"
            maxLength="500"
            placeholder="İşlem hakkında isteğe bağlı açıklama"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            disabled={isSaving}
          />
        </div>

        {transactionType ===
        "Gelir" ? (
          <div className="form-row">
            <div>
              <label
                className="form-label"
                htmlFor="category"
              >
                Gelir Kategorisi *
              </label>

              <select
                id="category"
                className="form-input"
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(
                    event.target.value,
                  )
                }
                disabled={
                  isSaving ||
                  categoryLoadStatus ===
                    "loading" ||
                  transactionCategoryOptions.length ===
                    0
                }
                required
              >
                <option value="">
                  Gelir kategorisi seçiniz
                </option>

                {transactionCategoryOptions.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.pathNames.join(
                        " > ",
                      )}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                className="form-label"
                htmlFor="amount"
              >
                Gelir Tutarı *
              </label>

              <input
                id="amount"
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                disabled={isSaving}
                required
              />
            </div>
          </div>
        ) : (
          <ExpenseForm
            merchantId={merchantId}
            setMerchantId={
              setMerchantId
            }
            merchants={merchants}
            branchId={branchId}
            setBranchId={
              setBranchId
            }
            merchantBranches={
              merchantBranches
            }
            expenseLines={
              expenseLines
            }
            transactionCategoryOptions={
              transactionCategoryOptions
            }
            categoryLoadStatus={
              categoryLoadStatus
            }
            products={products}
            brands={brands}
            handleExpenseLineChange={
              handleExpenseLineChange
            }
            handleRemoveExpenseLine={
              handleRemoveExpenseLine
            }
            handleAddExpenseLine={
              handleAddExpenseLine
            }
            transactionDiscount={
              transactionDiscount
            }
            setTransactionDiscount={
              setTransactionDiscount
            }
            couponCode={couponCode}
            setCouponCode={
              setCouponCode
            }
            receiptTotal={
              receiptTotal
            }
            setReceiptTotal={
              setReceiptTotal
            }
            expenseTotals={
              expenseTotals
            }
            formatAmount={
              formatAmount
            }
          />
        )}

        <button
          className="add-button"
          type="submit"
          disabled={
            isSaving ||
            transactionCategoryOptions.length ===
              0
          }
        >
          {isSaving
            ? "Kayıt Ekleniyor..."
            : "Finansal Kaydı Ekle"}
        </button>
      </form>

      {transactionFormError && (
        <p
          className="form-error"
          role="alert"
        >
          {transactionFormError}
        </p>
      )}
    </>
  );
}

export default TransactionForm;