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

function TransactionForm() {
  const dispatch = useDispatch();

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

  const products =
    useSelector(
      selectProducts,
    );

  const brands =
    useSelector(
      selectBrands,
    );

  const merchants =
    useSelector(
      selectMerchants,
    );

  const branches =
    useSelector(
      selectBranches,
    );

  const getTodayDateValue =
    () => {
      const today =
        new Date();

      const year =
        today.getFullYear();

      const month =
        String(
          today.getMonth() + 1,
        ).padStart(2, "0");

      const day =
        String(
          today.getDate(),
        ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

  const formatAmount =
    (amountMinor) => {
      return (
        amountMinor / 100
      ).toLocaleString(
        "tr-TR",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      );
    };

  const convertInputAmountToMinor =
    (value) => {
      const numericValue =
        getSafeNumber(value);

      if (
        numericValue <= 0
      ) {
        return 0;
      }

      return Math.round(
        numericValue * 100,
      );
    };

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
    transactionDiscount,
    setTransactionDiscount,
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

      setTransactionDiscount("");

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
        setTransactionDiscount("");

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
    };

  const handleRemoveExpenseLine =
    (lineId) => {
      setExpenseLines(
        (currentLines) => {
          if (
            currentLines.length ===
            1
          ) {
            return currentLines;
          }

          return currentLines.filter(
            (line) =>
              line.id !== lineId,
          );
        },
      );
    };

  const handleExpenseLineChange =
    (
      lineId,
      fieldName,
      fieldValue,
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
                "categoryId"
              ) {
                return {
                  ...line,

                  categoryId:
                    fieldValue,
                };
              }

              if (
                fieldName ===
                "productId"
              ) {
                const selectedProduct =
                  products.find(
                    (product) =>
                      product.id ===
                      fieldValue,
                  ) ?? null;

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
                  };
                }

                if (
                  selectedProduct.productType ===
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

                    purchaseQuantity:
                      "1",

                    unitCount: "1",

                    unitSize: "1",

                    unitType: "l",

                    unitPrice: "",

                    fuelType:
                      selectedProduct.fuelType ??
                      "gasoline",

                    liters: "",

                    fuelUnitPrice:
                      selectedProduct.defaultUnitPrice ??
                      "",

                    vehicleId: "",

                    odometer: "",
                  };
                }

                return {
                  ...line,

                  productId:
                    selectedProduct.id,

                  productType:
                    selectedProduct.productType ??
                    "standard",

                  brandId:
                    selectedProduct.brandId ??
                    "",

                  purchaseQuantity:
                    "1",

                  unitCount:
                    String(
                      selectedProduct.unitCount ??
                        1,
                    ),

                  unitSize:
                    String(
                      selectedProduct.unitSize ??
                        1,
                    ),

                  unitType:
                    selectedProduct.unitType ??
                    "adet",

                  unitPrice:
                    selectedProduct.defaultUnitPrice ??
                    "",

                  fuelType:
                    "gasoline",

                  liters: "",

                  fuelUnitPrice:
                    "",

                  vehicleId: "",

                  odometer: "",
                };
              }

              return {
                ...line,

                [fieldName]:
                  fieldValue,
              };
            },
          ),
      );
    };

  const prepareExpenseLines =
    () => {
      if (
        expenseLines.length ===
        0
      ) {
        throw new Error(
          "En az bir gider satırı eklemelisiniz.",
        );
      }

      return expenseLines.map(
        (line, index) => {
          const lineNumber =
            index + 1;

          const selectedCategory =
            activeCategories.find(
              (category) =>
                category.id ===
                line.categoryId,
            );

          if (
            !selectedCategory
          ) {
            throw new Error(
              `${lineNumber}. gider satırında kategori seçmelisiniz.`,
            );
          }

          if (
            !(
              selectedCategory.categoryType ===
                "expense" ||
              selectedCategory.categoryType ===
                "both"
            )
          ) {
            throw new Error(
              `${lineNumber}. gider satırındaki kategori gider işlemlerinde kullanılamaz.`,
            );
          }

          const amountMinor =
            convertInputAmountToMinor(
              line.amount,
            );

          if (
            amountMinor <= 0
          ) {
            throw new Error(
              `${lineNumber}. gider satırında tutar sıfırdan büyük olmalıdır.`,
            );
          }

          const discountMinor =
            line.discount
              ? convertInputAmountToMinor(
                  line.discount,
                )
              : 0;

          if (
            discountMinor < 0
          ) {
            throw new Error(
              `${lineNumber}. gider satırındaki indirim negatif olamaz.`,
            );
          }

          if (
            discountMinor >
            amountMinor
          ) {
            throw new Error(
              `${lineNumber}. gider satırındaki indirim tutardan büyük olamaz.`,
            );
          }

          const selectedProduct =
            products.find(
              (product) =>
                product.id ===
                line.productId,
            ) ?? null;

          const selectedBrand =
            brands.find(
              (brand) =>
                brand.id ===
                line.brandId,
            ) ?? null;

          const isFuelProduct =
            selectedProduct?.productType ===
              "fuel" ||
            line.productType ===
              "fuel";

          if (isFuelProduct) {
            const liters =
              getSafeNumber(
                line.liters,
              );

            const fuelUnitPrice =
              getSafeNumber(
                line.fuelUnitPrice,
              );

            if (
              liters <= 0
            ) {
              throw new Error(
                `${lineNumber}. yakıt satırında alınan litre sıfırdan büyük olmalıdır.`,
              );
            }

            if (
              fuelUnitPrice <= 0
            ) {
              throw new Error(
                `${lineNumber}. yakıt satırında litre fiyatı sıfırdan büyük olmalıdır.`,
              );
            }

            const calculatedFuelTotalMinor =
              calculateFuelTotalMinor(
                liters,
                fuelUnitPrice,
              );

            if (
              Math.abs(
                calculatedFuelTotalMinor -
                  amountMinor,
              ) >
              FUEL_TOTAL_TOLERANCE_MINOR
            ) {
              throw new Error(
                `${lineNumber}. yakıt satırında toplam tutar litre × litre fiyatı hesabıyla uyuşmuyor.`,
              );
            }

            const odometer =
              line.odometer === ""
                ? null
                : getSafeNumber(
                    line.odometer,
                  );

            if (
              odometer !== null &&
              odometer < 0
            ) {
              throw new Error(
                `${lineNumber}. yakıt satırında kilometre negatif olamaz.`,
              );
            }

            return {
              categoryId:
                selectedCategory.id,

              category:
                selectedCategory.name,

              categoryPath:
                selectedCategory.pathNames.join(
                  " > ",
                ),

              categoryPathIds:
                selectedCategory.pathIds,

              categoryType:
                selectedCategory.categoryType,

              productId:
                selectedProduct?.id ??
                "",

              productName:
                selectedProduct?.name ??
                "",

              productType:
                "fuel",

              brandId:
                selectedBrand?.id ??
                selectedProduct?.brandId ??
                "",

              brandName:
                selectedBrand?.name ??
                "",

              amount:
                line.amount,

              discount:
                line.discount || "0",

              note:
                line.note.trim(),

              fuelType:
                line.fuelType ||
                selectedProduct?.fuelType ||
                "gasoline",

              liters:
                String(liters),

              fuelUnitPrice:
                String(
                  fuelUnitPrice,
                ),

              vehicleId:
                line.vehicleId.trim(),

              odometer:
                odometer === null
                  ? ""
                  : String(
                      odometer,
                    ),

              purchaseQuantity:
                "1",

              unitCount: "1",

              unitSize: "1",

              unitType: "l",

              unitPrice:
                String(
                  fuelUnitPrice,
                ),
            };
          }

          const purchaseQuantity =
            line.productId
              ? getSafeNumber(
                  line.purchaseQuantity,
                )
              : 1;

          const unitCount =
            line.productId
              ? getSafeNumber(
                  line.unitCount,
                )
              : 1;

          const unitSize =
            line.productId
              ? getSafeNumber(
                  line.unitSize,
                )
              : 1;

          const unitPrice =
            line.productId &&
            line.unitPrice !== ""
              ? getSafeNumber(
                  line.unitPrice,
                )
              : 0;

          if (
            line.productId &&
            purchaseQuantity <= 0
          ) {
            throw new Error(
              `${lineNumber}. gider satırında satın alınan adet sıfırdan büyük olmalıdır.`,
            );
          }

          if (
            line.productId &&
            unitCount <= 0
          ) {
            throw new Error(
              `${lineNumber}. gider satırında paket içindeki ürün adedi sıfırdan büyük olmalıdır.`,
            );
          }

          if (
            line.productId &&
            unitSize <= 0
          ) {
            throw new Error(
              `${lineNumber}. gider satırında ürün miktarı sıfırdan büyük olmalıdır.`,
            );
          }

          if (
            line.productId &&
            unitPrice < 0
          ) {
            throw new Error(
              `${lineNumber}. gider satırında birim fiyat negatif olamaz.`,
            );
          }

          return {
            categoryId:
              selectedCategory.id,

            category:
              selectedCategory.name,

            categoryPath:
              selectedCategory.pathNames.join(
                " > ",
              ),

            categoryPathIds:
              selectedCategory.pathIds,

            categoryType:
              selectedCategory.categoryType,

            productId:
              selectedProduct?.id ??
              "",

            productName:
              selectedProduct?.name ??
              "",

            productType:
              selectedProduct?.productType ??
              line.productType ??
              "standard",

            brandId:
              selectedBrand?.id ??
              selectedProduct?.brandId ??
              "",

            brandName:
              selectedBrand?.name ??
              "",

            purchaseQuantity:
              String(
                purchaseQuantity,
              ),

            unitCount:
              String(unitCount),

            unitSize:
              String(unitSize),

            unitType:
              line.unitType ||
              "adet",

            unitPrice:
              unitPrice > 0
                ? String(
                    unitPrice,
                  )
                : "",

            amount:
              line.amount,

            discount:
              line.discount || "0",

            note:
              line.note.trim(),

            fuelType: "",

            liters: "",

            fuelUnitPrice: "",

            vehicleId: "",

            odometer: "",
          };
        },
      );
    };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setTransactionFormError("");

      if (!currentUser?.id) {
        setTransactionFormError(
          "Kullanıcı bilgisi bulunamadı.",
        );

        return;
      }

      if (
        !transactionDate
      ) {
        setTransactionFormError(
          "İşlem tarihi seçilmelidir.",
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

            // 8.GÜN
            // Giderin toplam tutarı artık kullanıcıdan
            // tekrar alınmıyor. Gider satırları ve
            // indirimlerden otomatik hesaplanıyor.
            amount:
              (
                expenseTotals.netTotalMinor /
                100
              ).toFixed(2),

            lines:
              preparedExpenseLines,

            transactionDiscount,

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
          error.message ||
            "Finansal kayıt hazırlanamadı.",
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
      }
    };

  return (
    <div className="category-action-panel">
      <h2 className="archive-title">
        Yeni Finansal Kayıt
      </h2>

      <p className="empty-message">
        Gelir veya gider işlemlerinizi
        buradan kaydedebilirsiniz.
      </p>

      <form
        onSubmit={
          handleSubmit
        }
      >
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
              required
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
        </div>

        <div className="form-row">
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
              value={paymentMethod}
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

              <option value="Banka Kartı">
                Banka Kartı
              </option>

              <option value="Kredi Kartı">
                Kredi Kartı
              </option>

              <option value="Havale / EFT">
                Havale / EFT
              </option>

              <option value="Diğer">
                Diğer
              </option>
            </select>
          </div>

          <div>
            <label
              className="form-label"
              htmlFor="transactionDescription"
            >
              Açıklama
            </label>

            <input
              id="transactionDescription"
              className="form-input"
              type="text"
              maxLength="250"
              placeholder="İsteğe bağlı açıklama"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              disabled={isSaving}
            />
          </div>
        </div>

        {transactionType ===
        "Gelir" ? (
          <div className="form-row">
            <div>
              <label
                className="form-label"
                htmlFor="transactionCategory"
              >
                Gelir Kategorisi *
              </label>

              <select
                id="transactionCategory"
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
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.pathNames.join(
                        " > ",
                      )}
                    </option>
                  ),
                )}
              </select>

              {transactionCategoryOptions.length ===
                0 && (
                <p className="form-error">
                  Gelir kategorisi
                  bulunmuyor. Önce gelir
                  türünde bir kategori
                  oluşturunuz.
                </p>
              )}
            </div>

            <div>
              <label
                className="form-label"
                htmlFor="transactionAmount"
              >
                Gelir Tutarı *
              </label>

              <input
                id="transactionAmount"
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
            expenseTotals={
              expenseTotals
            }
            formatAmount={
              formatAmount
            }
          />
        )}

        {transactionFormError && (
          <p className="form-error">
            {transactionFormError}
          </p>
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
            ? "Kaydediliyor..."
            : "Finansal Kaydı Ekle"}
        </button>
      </form>
    </div>
  );
}

export default TransactionForm;