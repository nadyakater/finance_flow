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
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";

import {
  allocateTransactionDiscount,
  calculateExpenseTotals,
  calculateLineAmounts,
  calculateRefundStatus,
  convertAmountToMinor,
  convertOptionalAmountToMinor,
  validateTransactionTotals,
} from "../domain/transactionCalculations";

// =====================================================
// Firestore Timestamp değerlerini ISO tarih metnine
// dönüştürür.
// =====================================================

function convertTimestampToIsoString(timestampValue) {
  if (!timestampValue) {
    return "";
  }

  if (typeof timestampValue.toDate === "function") {
    return timestampValue.toDate().toISOString();
  }

  if (typeof timestampValue === "string") {
    return timestampValue;
  }

  return "";
}

// =====================================================
// Bütün finansal kayıtlarda kullanılacak ortak audit
// alanlarını oluşturur.
// =====================================================

function createDefaultAuditFields(userId) {
  return {
    ownerId: userId,

    createdBy: userId,

    updatedBy: userId,

    isDeleted: false,

    version: 1,
  };
}

// =====================================================
// Tek bir gider satırını kayıt için hazırlar.
// =====================================================

function prepareExpenseLine(line, index) {
  if (!line.categoryId) {
    throw new Error("TRANSACTION_LINE_CATEGORY_REQUIRED");
  }

  const amountResult = calculateLineAmounts(line);

  return {
    id: line.id ?? `line-${index + 1}`,

    categoryId: line.categoryId,

    category: line.category ?? "",

    categoryPath: line.categoryPath ?? line.category ?? "",

    categoryPathIds: Array.isArray(line.categoryPathIds)
      ? line.categoryPathIds
      : [],

    categoryType: line.categoryType ?? "expense",

    productId: line.productId ?? "",

    productName: line.productName ?? "",

    productType: line.productType === "fuel" ? "fuel" : "standard",

    fuelType: line.productType === "fuel" ? (line.fuelType ?? "other") : "",

    liters: line.productType === "fuel" ? line.liters : "",

    fuelUnitPrice: line.productType === "fuel" ? line.fuelUnitPrice : "",

    vehicleId:
      line.productType === "fuel" ? (line.vehicleId?.trim() ?? "") : "",

    odometer: line.productType === "fuel" ? line.odometer : "",

    brandId: line.brandId ?? "",

    brandName: line.brandName ?? "",

    purchaseQuantity: line.purchaseQuantity,

    unitCount: line.unitCount,

    unitSize: line.unitSize,

    unitType: line.unitType ?? "adet",

    unitPrice: line.unitPrice,

    note: line.note?.trim() ?? "",

    ...amountResult,
  };
}

// =====================================================
// Gider işlemindeki bütün satırları hazırlar ve genel
// indirimi satırlara dağıtır.
// =====================================================

function prepareExpenseLines(transaction) {
  const receivedLines =
    Array.isArray(transaction.lines) && transaction.lines.length > 0
      ? transaction.lines
      : [
          {
            id: "line-1",

            categoryId: transaction.categoryId,

            category: transaction.category,

            categoryPath: transaction.categoryPath,

            categoryPathIds: transaction.categoryPathIds,

            categoryType: transaction.categoryType,

            amount: transaction.amount,

            discount: 0,
          },
        ];

  const preparedLines = receivedLines.map(prepareExpenseLine);

  const transactionDiscountMinor = convertOptionalAmountToMinor(
    transaction.transactionDiscount,
  );

  return allocateTransactionDiscount(preparedLines, transactionDiscountMinor);
}

// =====================================================
// Firestore'dan gelen tek bir işlem satırını uygulama
// modeline dönüştürür.
// =====================================================

function mapTransactionLine(line, index) {
  const grossAmountMinor = Number.isInteger(line.grossAmountMinor)
    ? line.grossAmountMinor
    : Number.isInteger(line.amountMinor)
      ? line.amountMinor
      : 0;

  const lineDiscountMinor = Number.isInteger(line.lineDiscountMinor)
    ? line.lineDiscountMinor
    : 0;

  const allocatedTransactionDiscountMinor = Number.isInteger(
    line.allocatedTransactionDiscountMinor,
  )
    ? line.allocatedTransactionDiscountMinor
    : 0;

  const netAmountMinor = Number.isInteger(line.netAmountMinor)
    ? line.netAmountMinor
    : grossAmountMinor - lineDiscountMinor - allocatedTransactionDiscountMinor;

  return {
    id: line.id ?? `line-${index + 1}`,

    categoryId: line.categoryId ?? "",

    category: line.category ?? "",

    categoryPath: line.categoryPath ?? line.category ?? "",

    categoryPathIds: Array.isArray(line.categoryPathIds)
      ? line.categoryPathIds
      : [],

    categoryType: line.categoryType ?? "expense",

    productId: line.productId ?? "",

    productName: line.productName ?? "",

    productType: line.productType === "fuel" ? "fuel" : "standard",

    fuelType: line.fuelType ?? "",

    liters: Number(line.liters ?? line.normalizedQuantity ?? 0),

    fuelUnitPriceMinor: Number.isInteger(line.fuelUnitPriceMinor)
      ? line.fuelUnitPriceMinor
      : Number.isInteger(line.normalizedUnitPriceMinor)
        ? line.normalizedUnitPriceMinor
        : 0,

    vehicleId: line.vehicleId ?? "",

    odometer: Number(line.odometer ?? 0),

    brandId: line.brandId ?? "",

    brandName: line.brandName ?? "",

    purchaseQuantity: Number(line.purchaseQuantity ?? 0),

    unitCount: Number(line.unitCount ?? 0),

    unitSize: Number(line.unitSize ?? 0),

    unitType: line.unitType ?? "",

    normalizedQuantity: Number(line.normalizedQuantity ?? 0),

    normalizedUnit: line.normalizedUnit ?? "",

    unitPriceMinor: Number.isInteger(line.unitPriceMinor)
      ? line.unitPriceMinor
      : 0,

    normalizedUnitPriceMinor: Number.isInteger(line.normalizedUnitPriceMinor)
      ? line.normalizedUnitPriceMinor
      : 0,

    grossAmountMinor,

    lineDiscountMinor,

    allocatedTransactionDiscountMinor,

    netAmountMinor,

    refundedMinor: Number.isInteger(line.refundedMinor)
      ? line.refundedMinor
      : 0,

    refundStatus: line.refundStatus ?? "none",

    note: line.note ?? "",

    amount: grossAmountMinor / 100,

    discount: lineDiscountMinor / 100,
  };
}

// =====================================================
// Firestore işlem belgesini uygulamanın kullanacağı
// transaction modeline dönüştürür.
// =====================================================

function mapTransactionDocument(transactionDocument) {
  const data = transactionDocument.data();

  const lines = Array.isArray(data.lines)
    ? data.lines.map(mapTransactionLine)
    : [];

  const calculatedLinesTotalMinor = lines.reduce(
    (total, line) => total + Number(line.netAmountMinor ?? 0),
    0,
  );

  const amountMinor = Number.isInteger(data.amountMinor)
    ? data.amountMinor
    : calculatedLinesTotalMinor;

  return {
    id: transactionDocument.id,

    ownerId: data.ownerId ?? "",

    transactionType: data.transactionType ?? "",

    category: data.category ?? "",

    categoryId: data.categoryId ?? "",

    categoryPath: data.categoryPath ?? data.category ?? "",

    categoryPathIds: Array.isArray(data.categoryPathIds)
      ? data.categoryPathIds
      : [],

    categoryType: data.categoryType ?? "",

    amount: amountMinor / 100,

    amountMinor,

    transactionMode:
      data.transactionMode ?? (lines.length > 1 ? "multiLine" : "singleLine"),

    lines,

    subtotalMinor: Number.isInteger(data.subtotalMinor)
      ? data.subtotalMinor
      : amountMinor,

    lineDiscountTotalMinor: Number.isInteger(data.lineDiscountTotalMinor)
      ? data.lineDiscountTotalMinor
      : 0,

    transactionDiscountMinor: Number.isInteger(data.transactionDiscountMinor)
      ? data.transactionDiscountMinor
      : 0,

    couponCode: data.couponCode ?? "",

    description: data.description ?? "",

    paymentMethod: data.paymentMethod ?? "",

    transactionDate: data.transactionDate ?? "",

    merchantId: data.merchantId ?? "",

    merchantName: data.merchantName ?? "",

    branchId: data.branchId ?? "",

    branchName: data.branchName ?? "",

    originalTransactionId: data.originalTransactionId ?? "",

    refundedMinor: Number.isInteger(data.refundedMinor)
      ? data.refundedMinor
      : 0,

    refundStatus: data.refundStatus ?? "none",

    refundReason: data.refundReason ?? "",

    refundedLines: Array.isArray(data.refundedLines) ? data.refundedLines : [],

    createdAtUtc: convertTimestampToIsoString(data.createdAtUtc),

    updatedAtUtc: convertTimestampToIsoString(data.updatedAtUtc),

    createdBy: data.createdBy ?? "",

    updatedBy: data.updatedBy ?? "",

    isDeleted: Boolean(data.isDeleted),

    version: Number(data.version ?? 1),
  };
}

// =====================================================
// Yeni gelir veya gider kaydı oluşturur.
// =====================================================

export async function createTransaction(userId, transaction) {
  if (!userId) {
    throw new Error("TRANSACTION_USER_REQUIRED");
  }

  if (!transaction.transactionDate) {
    throw new Error("TRANSACTION_DATE_REQUIRED");
  }

  if (!transaction.paymentMethod) {
    throw new Error("TRANSACTION_PAYMENT_METHOD_REQUIRED");
  }

  const isExpense = transaction.transactionType === "Gider";

  let transactionData;

  if (isExpense) {
    const preparedLines = prepareExpenseLines(transaction);

    const totals = calculateExpenseTotals(preparedLines);

    if (totals.amountMinor <= 0) {
      throw new Error("TRANSACTION_INVALID_AMOUNT");
    }

    validateTransactionTotals({
      lines: preparedLines,

      amountMinor: totals.amountMinor,
    });

    const firstLine = preparedLines[0];

    const uniqueCategoryIds = new Set(
      preparedLines.map((line) => line.categoryId),
    );

    const hasMultipleCategories = uniqueCategoryIds.size > 1;

    transactionData = {
      ...createDefaultAuditFields(userId),

      transactionType: "Gider",

      category: hasMultipleCategories ? "Çoklu Kategori" : firstLine.category,

      categoryId: hasMultipleCategories ? "" : firstLine.categoryId,

      categoryPath: hasMultipleCategories
        ? "Çoklu Kategori"
        : firstLine.categoryPath,

      categoryPathIds: hasMultipleCategories ? [] : firstLine.categoryPathIds,

      categoryType: "expense",

      transactionMode: preparedLines.length > 1 ? "multiLine" : "singleLine",

      lines: preparedLines.map((line) => ({
        ...line,

        refundedMinor: 0,

        refundStatus: "none",
      })),

      ...totals,

      couponCode: transaction.couponCode?.trim() ?? "",

      description: transaction.description?.trim() ?? "",

      paymentMethod: transaction.paymentMethod,

      transactionDate: transaction.transactionDate,

      merchantId: transaction.merchantId ?? "",

      merchantName: transaction.merchantName ?? "",

      branchId: transaction.branchId ?? "",

      branchName: transaction.branchName ?? "",

      refundedMinor: 0,

      refundStatus: "none",

      originalTransactionId: "",

      refundReason: "",

      refundedLines: [],
    };
  } else {
    if (!transaction.categoryId) {
      throw new Error("TRANSACTION_CATEGORY_REQUIRED");
    }

    const amountMinor = convertAmountToMinor(transaction.amount);

    transactionData = {
      ...createDefaultAuditFields(userId),

      transactionType: "Gelir",

      category: transaction.category || "Genel Gelir",

      categoryId: transaction.categoryId,

      categoryPath:
        transaction.categoryPath || transaction.category || "Genel Gelir",

      categoryPathIds: Array.isArray(transaction.categoryPathIds)
        ? transaction.categoryPathIds
        : [],

      categoryType: "income",

      transactionMode: "singleLine",

      lines: [],

      subtotalMinor: amountMinor,

      lineDiscountTotalMinor: 0,

      transactionDiscountMinor: 0,

      amountMinor,

      couponCode: "",

      description: transaction.description?.trim() ?? "",

      paymentMethod: transaction.paymentMethod,

      transactionDate: transaction.transactionDate,

      merchantId: "",

      merchantName: "",

      branchId: "",

      branchName: "",

      refundedMinor: 0,

      refundStatus: "none",

      originalTransactionId: "",

      refundReason: "",

      refundedLines: [],
    };
  }

  const transactionReference = await addDoc(
    collection(db, "users", userId, "transactions"),
    {
      ...transactionData,

      createdAtUtc: serverTimestamp(),

      updatedAtUtc: serverTimestamp(),
    },
  );

  const transactionSnapshot = await getDoc(transactionReference);

  return mapTransactionDocument(transactionSnapshot);
}

// =====================================================
// İade edilecek satırları hazırlar.
// =====================================================

function prepareRefundLines(originalLines, requestedRefundLines) {
  if (
    !Array.isArray(requestedRefundLines) ||
    requestedRefundLines.length === 0
  ) {
    return [];
  }

  return requestedRefundLines.map((requestedLine) => {
    const originalLine = originalLines.find(
      (line) => line.id === requestedLine.lineId,
    );

    if (!originalLine) {
      throw new Error("TRANSACTION_REFUND_LINE_INVALID");
    }

    const refundAmountMinor = convertAmountToMinor(requestedLine.amount);

    const currentLineRefundedMinor = Number(originalLine.refundedMinor ?? 0);

    const remainingLineMinor =
      Number(originalLine.netAmountMinor ?? 0) - currentLineRefundedMinor;

    if (refundAmountMinor > remainingLineMinor) {
      throw new Error("TRANSACTION_REFUND_EXCEEDS_REMAINING");
    }

    return {
      lineId: originalLine.id,

      productId: originalLine.productId ?? "",

      productName: originalLine.productName ?? "",

      categoryId: originalLine.categoryId ?? "",

      category: originalLine.category ?? "",

      amountMinor: refundAmountMinor,
    };
  });
}

// =====================================================
// Tam veya kısmi iade oluşturur.
// Orijinal gider ile iade kaydı aynı transaction içinde
// güncellenir.
// =====================================================

export async function createRefundTransaction(userId, refund) {
  if (!refund.originalTransactionId) {
    throw new Error("REFUND_ORIGINAL_REQUIRED");
  }

  const originalTransactionReference = doc(
    db,
    "users",
    userId,
    "transactions",
    refund.originalTransactionId,
  );

  const refundTransactionReference = doc(
    collection(db, "users", userId, "transactions"),
  );

  await runTransaction(db, async (firestoreTransaction) => {
    const originalSnapshot = await firestoreTransaction.get(
      originalTransactionReference,
    );

    if (!originalSnapshot.exists()) {
      throw new Error("REFUND_ORIGINAL_NOT_FOUND");
    }

    const originalData = originalSnapshot.data();

    if (originalData.transactionType !== "Gider") {
      throw new Error("REFUND_ONLY_EXPENSE");
    }

    if (originalData.isDeleted) {
      throw new Error("REFUND_ORIGINAL_NOT_FOUND");
    }

    const originalLines = Array.isArray(originalData.lines)
      ? originalData.lines
      : [];

    const preparedRefundLines = prepareRefundLines(
      originalLines,
      refund.refundedLines,
    );

    const refundAmountMinor =
      preparedRefundLines.length > 0
        ? preparedRefundLines.reduce(
            (total, line) => total + line.amountMinor,
            0,
          )
        : convertAmountToMinor(refund.amount);

    const originalAmountMinor = Number(originalData.amountMinor ?? 0);

    const currentRefundedMinor = Number(originalData.refundedMinor ?? 0);

    const remainingRefundableMinor = originalAmountMinor - currentRefundedMinor;

    if (
      refundAmountMinor <= 0 ||
      refundAmountMinor > remainingRefundableMinor
    ) {
      throw new Error("REFUND_AMOUNT_EXCEEDED");
    }

    const newRefundedMinor = currentRefundedMinor + refundAmountMinor;

    const newRefundStatus = calculateRefundStatus(
      originalAmountMinor,
      newRefundedMinor,
    );

    let updatedOriginalLines = originalLines;

    if (preparedRefundLines.length > 0) {
      updatedOriginalLines = originalLines.map((originalLine) => {
        const relatedRefundLine = preparedRefundLines.find(
          (refundLine) => refundLine.lineId === originalLine.id,
        );

        if (!relatedRefundLine) {
          return originalLine;
        }

        const newLineRefundedMinor =
          Number(originalLine.refundedMinor ?? 0) +
          relatedRefundLine.amountMinor;

        return {
          ...originalLine,

          refundedMinor: newLineRefundedMinor,

          refundStatus: calculateRefundStatus(
            Number(originalLine.netAmountMinor ?? 0),
            newLineRefundedMinor,
          ),
        };
      });
    }

    firestoreTransaction.update(originalTransactionReference, {
      refundedMinor: newRefundedMinor,

      refundStatus: newRefundStatus,

      lines: updatedOriginalLines,

      updatedBy: userId,

      updatedAtUtc: serverTimestamp(),

      version: Number(originalData.version ?? 1) + 1,
    });

    firestoreTransaction.set(refundTransactionReference, {
      ...createDefaultAuditFields(userId),

      transactionType: "İade",

      originalTransactionId: originalSnapshot.id,

      category: originalData.category ?? "",

      categoryId: originalData.categoryId ?? "",

      categoryPath: originalData.categoryPath ?? "",

      categoryPathIds: Array.isArray(originalData.categoryPathIds)
        ? originalData.categoryPathIds
        : [],

      categoryType: "expense",

      amountMinor: refundAmountMinor,

      subtotalMinor: refundAmountMinor,

      transactionMode:
        preparedRefundLines.length > 1 ? "multiLine" : "singleLine",

      lines: [],

      lineDiscountTotalMinor: 0,

      transactionDiscountMinor: 0,

      couponCode: "",

      description: "",

      paymentMethod: refund.paymentMethod ?? originalData.paymentMethod ?? "",

      transactionDate: refund.transactionDate ?? "",

      merchantId: originalData.merchantId ?? "",

      merchantName: originalData.merchantName ?? "",

      branchId: originalData.branchId ?? "",

      branchName: originalData.branchName ?? "",

      refundedMinor: 0,

      refundStatus: "none",

      refundReason: refund.reason?.trim() ?? "",

      refundedLines: preparedRefundLines,

      createdAtUtc: serverTimestamp(),

      updatedAtUtc: serverTimestamp(),
    });
  });

  const refundSnapshot = await getDoc(refundTransactionReference);

  return mapTransactionDocument(refundSnapshot);
}

// =====================================================
// Finansal kayıtları kalıcı olarak silmek yerine
// soft-delete yöntemiyle arşivler.
// =====================================================

export async function archiveTransaction(userId, transactionId) {
  const transactionReference = doc(
    db,
    "users",
    userId,
    "transactions",
    transactionId,
  );

  const transactionSnapshot = await getDoc(transactionReference);

  if (!transactionSnapshot.exists()) {
    throw new Error("TRANSACTION_NOT_FOUND");
  }

  const transactionData = transactionSnapshot.data();

  await updateDoc(transactionReference, {
    isDeleted: true,

    updatedBy: userId,

    updatedAtUtc: serverTimestamp(),

    version: Number(transactionData.version ?? 1) + 1,
  });

  return transactionId;
}

// Kullanıcının aktif finansal kayıtlarını getirir.
export async function getTransactions(userId) {
  const transactionsQuery = query(
    collection(db, "users", userId, "transactions"),
    orderBy("createdAtUtc", "desc"),
  );

  const transactionsSnapshot = await getDocs(transactionsQuery);

  return transactionsSnapshot.docs
    .map(mapTransactionDocument)
    .filter((transaction) => !transaction.isDeleted);
}
