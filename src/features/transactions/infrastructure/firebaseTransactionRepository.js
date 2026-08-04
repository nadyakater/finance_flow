import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../../firebase";

function convertAmountToMinor(amount) {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "TRANSACTION_INVALID_AMOUNT",
    );
  }

  return Math.round(
    numericAmount * 100,
  );
}

function convertOptionalAmountToMinor(
  amount,
) {
  if (
    amount === "" ||
    amount === null ||
    amount === undefined
  ) {
    return 0;
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 0
  ) {
    throw new Error(
      "TRANSACTION_INVALID_DISCOUNT",
    );
  }

  return Math.round(
    numericAmount * 100,
  );
}

function convertPositiveNumber(
  value,
  fallbackValue,
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallbackValue;
  }

  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    throw new Error(
      "TRANSACTION_INVALID_QUANTITY",
    );
  }

  return numericValue;
}

function convertTimestampToIsoString(
  timestampValue,
) {
  if (!timestampValue) {
    return "";
  }

  if (
    typeof timestampValue.toDate ===
    "function"
  ) {
    return timestampValue
      .toDate()
      .toISOString();
  }

  if (
    typeof timestampValue === "string"
  ) {
    return timestampValue;
  }

  return "";
}

function calculateProductMetrics(
  line,
  netAmountMinor,
) {
  const hasProductInformation =
    Boolean(
      line.productId ||
        line.productName,
    );

  if (!hasProductInformation) {
    return {
      purchaseQuantity: 0,
      unitCount: 0,
      unitSize: 0,
      unitType: "",
      normalizedQuantity: 0,
      normalizedUnit: "",
      normalizedUnitPriceMinor: 0,
      unitPriceMinor: 0,
    };
  }

  const purchaseQuantity =
    convertPositiveNumber(
      line.purchaseQuantity,
      1,
    );

  const unitCount =
    convertPositiveNumber(
      line.unitCount,
      1,
    );

  const unitSize =
    convertPositiveNumber(
      line.unitSize,
      1,
    );

  const unitType =
    line.unitType || "piece";

  const totalUnitQuantity =
    purchaseQuantity *
    unitCount *
    unitSize;

  let normalizedQuantity = 0;
  let normalizedUnit = "";

  if (unitType === "ml") {
    normalizedQuantity =
      totalUnitQuantity / 1000;

    normalizedUnit = "L";
  } else if (unitType === "l") {
    normalizedQuantity =
      totalUnitQuantity;

    normalizedUnit = "L";
  } else if (unitType === "g") {
    normalizedQuantity =
      totalUnitQuantity / 1000;

    normalizedUnit = "kg";
  } else if (unitType === "kg") {
    normalizedQuantity =
      totalUnitQuantity;

    normalizedUnit = "kg";
  } else {
    normalizedQuantity =
      totalUnitQuantity;

    normalizedUnit = "adet";
  }

  const enteredUnitPriceMinor =
    convertOptionalAmountToMinor(
      line.unitPrice,
    );

  const unitPriceMinor =
    enteredUnitPriceMinor > 0
      ? enteredUnitPriceMinor
      : Math.round(
          netAmountMinor /
            purchaseQuantity,
        );

  const normalizedUnitPriceMinor =
    normalizedQuantity > 0
      ? Math.round(
          netAmountMinor /
            normalizedQuantity,
        )
      : 0;

  return {
    purchaseQuantity,
    unitCount,
    unitSize,
    unitType,
    normalizedQuantity,
    normalizedUnit,
    normalizedUnitPriceMinor,
    unitPriceMinor,
  };
}

function allocateTransactionDiscount(
  lines,
  transactionDiscountMinor,
) {
  if (
    transactionDiscountMinor === 0
  ) {
    return lines.map((line) => {
      const netAmountMinor =
        line.amountAfterLineDiscountMinor;

      return {
        ...line,

        allocatedTransactionDiscountMinor:
          0,

        netAmountMinor,

        ...calculateProductMetrics(
          line,
          netAmountMinor,
        ),
      };
    });
  }

  const totalAfterLineDiscountMinor =
    lines.reduce(
      (total, line) =>
        total +
        line.amountAfterLineDiscountMinor,
      0,
    );

  if (
    transactionDiscountMinor >
    totalAfterLineDiscountMinor
  ) {
    throw new Error(
      "TRANSACTION_INVALID_DISCOUNT",
    );
  }

  const discountShares = lines.map(
    (line, index) => {
      const exactNumerator =
        transactionDiscountMinor *
        line.amountAfterLineDiscountMinor;

      return {
        index,

        allocatedMinor: Math.floor(
          exactNumerator /
            totalAfterLineDiscountMinor,
        ),

        remainder:
          exactNumerator %
          totalAfterLineDiscountMinor,
      };
    },
  );

  const allocatedTotalMinor =
    discountShares.reduce(
      (total, share) =>
        total +
        share.allocatedMinor,
      0,
    );

  let remainingDiscountMinor =
    transactionDiscountMinor -
    allocatedTotalMinor;

  const sharesByRemainder = [
    ...discountShares,
  ].sort(
    (firstShare, secondShare) =>
      secondShare.remainder -
        firstShare.remainder ||
      firstShare.index -
        secondShare.index,
  );

  for (
    let index = 0;
    index <
      sharesByRemainder.length &&
    remainingDiscountMinor > 0;
    index += 1
  ) {
    sharesByRemainder[
      index
    ].allocatedMinor += 1;

    remainingDiscountMinor -= 1;
  }

  return lines.map(
    (line, index) => {
      const relatedShare =
        discountShares.find(
          (share) =>
            share.index === index,
        );

      const allocatedTransactionDiscountMinor =
        relatedShare
          ?.allocatedMinor ?? 0;

      const netAmountMinor =
        line.amountAfterLineDiscountMinor -
        allocatedTransactionDiscountMinor;

      return {
        ...line,

        allocatedTransactionDiscountMinor,

        netAmountMinor,

        ...calculateProductMetrics(
          line,
          netAmountMinor,
        ),
      };
    },
  );
}

function prepareExpenseLines(
  transaction,
) {
  const receivedLines =
    Array.isArray(
      transaction.lines,
    ) &&
    transaction.lines.length > 0
      ? transaction.lines
      : [
          {
            id: "line-1",

            categoryId:
              transaction.categoryId,

            category:
              transaction.category,

            categoryPath:
              transaction.categoryPath,

            categoryPathIds:
              transaction.categoryPathIds,

            categoryType:
              transaction.categoryType,

            amount:
              transaction.amount,

            discount: 0,
          },
        ];

  const preparedLines =
    receivedLines.map(
      (line, index) => {
        if (!line.categoryId) {
          throw new Error(
            "TRANSACTION_LINE_CATEGORY_REQUIRED",
          );
        }

        const grossAmountMinor =
          convertAmountToMinor(
            line.amount,
          );

        const lineDiscountMinor =
          convertOptionalAmountToMinor(
            line.discount,
          );

        if (
          lineDiscountMinor >
          grossAmountMinor
        ) {
          throw new Error(
            "TRANSACTION_INVALID_DISCOUNT",
          );
        }

        return {
          id:
            line.id ??
            `line-${index + 1}`,

          categoryId:
            line.categoryId,

          category:
            line.category ?? "",

          categoryPath:
            line.categoryPath ??
            line.category ??
            "",

          categoryPathIds:
            Array.isArray(
              line.categoryPathIds,
            )
              ? line.categoryPathIds
              : [],

          categoryType:
            line.categoryType ??
            "expense",

          // 6.GÜN - Ürün ve marka bilgileri gider satırına eklendi.
          productId:
            line.productId ?? "",

          productName:
            line.productName ?? "",

          brandId:
            line.brandId ?? "",

          brandName:
            line.brandName ?? "",

          purchaseQuantity:
            line.purchaseQuantity,

          unitCount:
            line.unitCount,

          unitSize:
            line.unitSize,

          unitType:
            line.unitType,

          unitPrice:
            line.unitPrice,

          grossAmountMinor,

          lineDiscountMinor,

          amountAfterLineDiscountMinor:
            grossAmountMinor -
            lineDiscountMinor,
        };
      },
    );

  const transactionDiscountMinor =
    convertOptionalAmountToMinor(
      transaction.transactionDiscount,
    );

  return allocateTransactionDiscount(
    preparedLines,
    transactionDiscountMinor,
  );
}

function mapTransactionLine(
  line,
  index,
) {
  const grossAmountMinor =
    Number.isInteger(
      line.grossAmountMinor,
    )
      ? line.grossAmountMinor
      : Number.isInteger(
            line.amountMinor,
          )
        ? line.amountMinor
        : 0;

  const lineDiscountMinor =
    Number.isInteger(
      line.lineDiscountMinor,
    )
      ? line.lineDiscountMinor
      : 0;

  const allocatedTransactionDiscountMinor =
    Number.isInteger(
      line.allocatedTransactionDiscountMinor,
    )
      ? line.allocatedTransactionDiscountMinor
      : 0;

  const netAmountMinor =
    Number.isInteger(
      line.netAmountMinor,
    )
      ? line.netAmountMinor
      : grossAmountMinor -
        lineDiscountMinor -
        allocatedTransactionDiscountMinor;

  return {
    id:
      line.id ??
      `line-${index + 1}`,

    categoryId:
      line.categoryId ?? "",

    category:
      line.category ?? "",

    categoryPath:
      line.categoryPath ??
      line.category ??
      "",

    categoryPathIds:
      Array.isArray(
        line.categoryPathIds,
      )
        ? line.categoryPathIds
        : [],

    categoryType:
      line.categoryType ??
      "expense",

    // 6.GÜN - Ürün, marka, miktar ve normalize fiyat bilgileri uygulama modeline eklendi.
    productId:
      line.productId ?? "",

    productName:
      line.productName ?? "",

    brandId:
      line.brandId ?? "",

    brandName:
      line.brandName ?? "",

    purchaseQuantity:
      Number(
        line.purchaseQuantity ?? 0,
      ),

    unitCount:
      Number(
        line.unitCount ?? 0,
      ),

    unitSize:
      Number(
        line.unitSize ?? 0,
      ),

    unitType:
      line.unitType ?? "",

    normalizedQuantity:
      Number(
        line.normalizedQuantity ??
          0,
      ),

    normalizedUnit:
      line.normalizedUnit ?? "",

    unitPriceMinor:
      Number.isInteger(
        line.unitPriceMinor,
      )
        ? line.unitPriceMinor
        : 0,

    normalizedUnitPriceMinor:
      Number.isInteger(
        line.normalizedUnitPriceMinor,
      )
        ? line.normalizedUnitPriceMinor
        : 0,

    grossAmountMinor,

    lineDiscountMinor,

    allocatedTransactionDiscountMinor,

    netAmountMinor,

    amount:
      grossAmountMinor / 100,

    discount:
      lineDiscountMinor / 100,
  };
}

function mapTransactionDocument(
  transactionDocument,
) {
  const data =
    transactionDocument.data();

  // 5.2.GÜN - Çok satırlı gider bilgileri Firestore belgesinden uygulama modeline dönüştürüldü.
  const lines = Array.isArray(
    data.lines,
  )
    ? data.lines.map(
        mapTransactionLine,
      )
    : [];

  const calculatedLinesTotalMinor =
    lines.reduce(
      (total, line) =>
        total +
        line.netAmountMinor,
      0,
    );

  const amountMinor =
    Number.isInteger(
      data.amountMinor,
    )
      ? data.amountMinor
      : lines.length > 0
        ? calculatedLinesTotalMinor
        : Math.round(
            Number(
              data.amount ?? 0,
            ) * 100,
          );

  return {
    id: transactionDocument.id,

    transactionType:
      data.transactionType ?? "",

    // 4.GÜN - Gelir gider kategori bilgisi eklendi.
    category:
      data.category ?? "",

    // 5.GÜN - Kategori kimliği ve kategori yolu işlem modeline eklendi.
    categoryId:
      data.categoryId ?? "",

    categoryPath:
      data.categoryPath ??
      data.category ??
      "",

    categoryPathIds:
      Array.isArray(
        data.categoryPathIds,
      )
        ? data.categoryPathIds
        : [],

    categoryType:
      data.categoryType ?? "",

    // 4.GÜN - Kullanıcının girdiği miktar bilgisi eklendi.
    amount:
      amountMinor / 100,

    // 5.GÜN - Para miktarı kuruş cinsinden tam sayı olarak saklandı.
    amountMinor,

    // 5.2.GÜN - Gider satırları, indirim ve kupon bilgileri işlem modeline eklendi.
    transactionMode:
      data.transactionMode ??
      (lines.length > 1
        ? "multiLine"
        : "singleLine"),

    lines,

    subtotalMinor:
      Number.isInteger(
        data.subtotalMinor,
      )
        ? data.subtotalMinor
        : amountMinor,

    lineDiscountTotalMinor:
      Number.isInteger(
        data.lineDiscountTotalMinor,
      )
        ? data.lineDiscountTotalMinor
        : 0,

    transactionDiscountMinor:
      Number.isInteger(
        data.transactionDiscountMinor,
      )
        ? data.transactionDiscountMinor
        : 0,

    couponCode:
      data.couponCode ?? "",

    paymentMethod:
      data.paymentMethod ?? "",

    transactionDate:
      data.transactionDate ?? "",

    // 6.GÜN - Firma ve şube bilgileri işlem modeline eklendi.
    merchantId:
      data.merchantId ?? "",

    merchantName:
      data.merchantName ?? "",

    branchId:
      data.branchId ?? "",

    branchName:
      data.branchName ?? "",

    // 6.GÜN - İade işlem ilişkisi ve iade durumu işlem modeline eklendi.
    originalTransactionId:
      data.originalTransactionId ??
      "",

    refundedMinor:
      Number.isInteger(
        data.refundedMinor,
      )
        ? data.refundedMinor
        : 0,

    refundStatus:
      data.refundStatus ?? "none",

    refundReason:
      data.refundReason ?? "",

    createdAtUtc:
      convertTimestampToIsoString(
        data.createdAtUtc,
      ),

    updatedAtUtc:
      convertTimestampToIsoString(
        data.updatedAtUtc,
      ),
  };
}

// 3.GÜN - Gelir ve gider kayıtlarının Firestore'a eklenmesi sağlandı.
// 4.GÜN - Gelir gider kategori ve miktar kaydı eklendi.
// 5.GÜN - Kategori ağacı bilgileri ve kuruş bazlı miktar kaydı eklendi.
// 5.2.GÜN - Tek ve çok satırlı giderler ile indirim bilgileri aynı işlem belgesinde saklandı.
// 6.GÜN - Firma, şube, ürün, marka, miktar ve normalize fiyat bilgileri işlem kaydına eklendi.
export async function createTransaction(
  userId,
  transaction,
) {
  const isExpense =
    transaction.transactionType ===
    "Gider";

  let transactionData;

  if (isExpense) {
    const preparedLines =
      prepareExpenseLines(
        transaction,
      );

    const subtotalMinor =
      preparedLines.reduce(
        (total, line) =>
          total +
          line.grossAmountMinor,
        0,
      );

    const lineDiscountTotalMinor =
      preparedLines.reduce(
        (total, line) =>
          total +
          line.lineDiscountMinor,
        0,
      );

    const transactionDiscountMinor =
      preparedLines.reduce(
        (total, line) =>
          total +
          line.allocatedTransactionDiscountMinor,
        0,
      );

    const amountMinor =
      preparedLines.reduce(
        (total, line) =>
          total +
          line.netAmountMinor,
        0,
      );

    if (amountMinor <= 0) {
      throw new Error(
        "TRANSACTION_INVALID_AMOUNT",
      );
    }

    const firstLine =
      preparedLines[0];

    const hasMultipleCategories =
      new Set(
        preparedLines.map(
          (line) =>
            line.categoryId,
        ),
      ).size > 1;

    transactionData = {
      ownerId: userId,

      transactionType:
        transaction.transactionType,

      category:
        hasMultipleCategories
          ? "Çoklu Kategori"
          : firstLine.category,

      categoryId:
        hasMultipleCategories
          ? ""
          : firstLine.categoryId,

      categoryPath:
        hasMultipleCategories
          ? "Çoklu Kategori"
          : firstLine.categoryPath,

      categoryPathIds:
        hasMultipleCategories
          ? []
          : firstLine.categoryPathIds,

      categoryType: "expense",

      transactionMode:
        preparedLines.length > 1
          ? "multiLine"
          : "singleLine",

      lines: preparedLines,

      subtotalMinor,

      lineDiscountTotalMinor,

      transactionDiscountMinor,

      amountMinor,

      couponCode:
        transaction.couponCode
          ?.trim() ?? "",

      paymentMethod:
        transaction.paymentMethod ??
        "",

      transactionDate:
        transaction.transactionDate ??
        "",

      // 6.GÜN - Firma ve şube kimlikleri ad bilgileriyle birlikte kaydedildi.
      merchantId:
        transaction.merchantId ??
        "",

      merchantName:
        transaction.merchantName ??
        "",

      branchId:
        transaction.branchId ?? "",

      branchName:
        transaction.branchName ??
        "",

      refundedMinor: 0,

      refundStatus: "none",

      originalTransactionId: "",

      refundReason: "",
    };
  } else {
    const amountMinor =
      convertAmountToMinor(
        transaction.amount,
      );

    transactionData = {
      ownerId: userId,

      transactionType:
        transaction.transactionType,

      // 5.2.GÜN - Gelir kaydı kategori seçilmeden de oluşturulabilir hale getirildi.
      category:
        transaction.category ||
        "Genel Gelir",

      categoryId:
        transaction.categoryId ??
        "",

      categoryPath:
        transaction.categoryPath ||
        transaction.category ||
        "Genel Gelir",

      categoryPathIds:
        Array.isArray(
          transaction.categoryPathIds,
        )
          ? transaction.categoryPathIds
          : [],

      categoryType:
        transaction.categoryType ||
        "income",

      transactionMode:
        "singleLine",

      lines: [],

      subtotalMinor:
        amountMinor,

      lineDiscountTotalMinor: 0,

      transactionDiscountMinor: 0,

      amountMinor,

      couponCode: "",

      paymentMethod:
        transaction.paymentMethod ??
        "",

      transactionDate:
        transaction.transactionDate ??
        "",

      merchantId: "",

      merchantName: "",

      branchId: "",

      branchName: "",

      refundedMinor: 0,

      refundStatus: "none",

      originalTransactionId: "",

      refundReason: "",
    };
  }

  const transactionReference =
    await addDoc(
      collection(
        db,
        "users",
        userId,
        "transactions",
      ),
      {
        ...transactionData,

        createdAtUtc:
          serverTimestamp(),

        updatedAtUtc:
          serverTimestamp(),
      },
    );

  const transactionSnapshot =
    await getDoc(
      transactionReference,
    );

  return mapTransactionDocument(
    transactionSnapshot,
  );
}

// 6.GÜN - Tam veya kısmi iadenin orijinal gider kaydıyla bağlantılı oluşturulması sağlandı.
export async function createRefundTransaction(
  userId,
  refund,
) {
  if (
    !refund.originalTransactionId
  ) {
    throw new Error(
      "REFUND_ORIGINAL_REQUIRED",
    );
  }

  const refundAmountMinor =
    convertAmountToMinor(
      refund.amount,
    );

  const originalTransactionReference =
    doc(
      db,
      "users",
      userId,
      "transactions",
      refund.originalTransactionId,
    );

  const refundTransactionReference =
    doc(
      collection(
        db,
        "users",
        userId,
        "transactions",
      ),
    );

  await runTransaction(
    db,
    async (
      firestoreTransaction,
    ) => {
      const originalSnapshot =
        await firestoreTransaction.get(
          originalTransactionReference,
        );

      if (
        !originalSnapshot.exists()
      ) {
        throw new Error(
          "REFUND_ORIGINAL_NOT_FOUND",
        );
      }

      const originalData =
        originalSnapshot.data();

      if (
        originalData.transactionType !==
        "Gider"
      ) {
        throw new Error(
          "REFUND_ONLY_EXPENSE",
        );
      }

      const originalAmountMinor =
        Number(
          originalData.amountMinor ??
            0,
        );

      const currentRefundedMinor =
        Number(
          originalData.refundedMinor ??
            0,
        );

      const remainingRefundableMinor =
        originalAmountMinor -
        currentRefundedMinor;

      if (
        remainingRefundableMinor <= 0 ||
        refundAmountMinor >
          remainingRefundableMinor
      ) {
        throw new Error(
          "REFUND_AMOUNT_EXCEEDED",
        );
      }

      const newRefundedMinor =
        currentRefundedMinor +
        refundAmountMinor;

      const refundStatus =
        newRefundedMinor ===
        originalAmountMinor
          ? "full"
          : "partial";

      firestoreTransaction.update(
        originalTransactionReference,
        {
          refundedMinor:
            newRefundedMinor,

          refundStatus,

          updatedAtUtc:
            serverTimestamp(),
        },
      );

      firestoreTransaction.set(
        refundTransactionReference,
        {
          ownerId: userId,

          transactionType: "İade",

          originalTransactionId:
            originalSnapshot.id,

          category:
            originalData.category ??
            "",

          categoryId:
            originalData.categoryId ??
            "",

          categoryPath:
            originalData.categoryPath ??
            "",

          categoryPathIds:
            Array.isArray(
              originalData.categoryPathIds,
            )
              ? originalData.categoryPathIds
              : [],

          categoryType: "expense",

          amountMinor:
            refundAmountMinor,

          subtotalMinor:
            refundAmountMinor,

          transactionMode:
            "singleLine",

          lines: [],

          lineDiscountTotalMinor: 0,

          transactionDiscountMinor: 0,

          couponCode: "",

          paymentMethod:
            refund.paymentMethod ??
            originalData.paymentMethod ??
            "",

          transactionDate:
            refund.transactionDate ??
            "",

          merchantId:
            originalData.merchantId ??
            "",

          merchantName:
            originalData.merchantName ??
            "",

          branchId:
            originalData.branchId ??
            "",

          branchName:
            originalData.branchName ??
            "",

          refundedMinor: 0,

          refundStatus: "none",

          refundReason:
            refund.reason?.trim() ??
            "",

          createdAtUtc:
            serverTimestamp(),

          updatedAtUtc:
            serverTimestamp(),
        },
      );
    },
  );

  const refundSnapshot =
    await getDoc(
      refundTransactionReference,
    );

  return mapTransactionDocument(
    refundSnapshot,
  );
}

// 3.GÜN - Kullanıcının gelir ve gider kayıtları Firestore'dan getirildi.
export async function getTransactions(
  userId,
) {
  const transactionsQuery =
    query(
      collection(
        db,
        "users",
        userId,
        "transactions",
      ),
      orderBy(
        "createdAtUtc",
        "desc",
      ),
    );

  const transactionsSnapshot =
    await getDocs(
      transactionsQuery,
    );

  return transactionsSnapshot.docs.map(
    mapTransactionDocument,
  );
}