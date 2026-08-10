import {
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

import {
  createInstallmentSchedule,
} from "../domain/installmentCalculations";

import {
  calculateStatementPeriod,
} from "../../creditCards/domain/statementCalculations";

import {
  prepareStatementPeriodWrite,
  prepareStatementRefundWrite,
  writeStatementPeriod,
} from "../../statements/infrastructure/statementPeriodWriter";

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
    typeof timestampValue ===
    "string"
  ) {
    return timestampValue;
  }

  return "";
}

function createDefaultAuditFields(
  userId,
) {
  return {
    ownerId: userId,

    createdBy: userId,

    updatedBy: userId,

    isDeleted: false,

    version: 1,
  };
}

// =====================================================
// 11.GÜN
// Ekstre dönemi geçmişse closed, henüz gelmemişse
// projected olarak gösterilmesi sağlandı.
// =====================================================

function getCurrentStatementStatus(
  cycleEnd,
  savedStatus,
) {
  if (!cycleEnd) {
    return savedStatus || "";
  }

  const today = new Date();

  const todayValue = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  return todayValue > cycleEnd
    ? "closed"
    : "projected";
}

function prepareExpenseLine(
  line,
  index,
) {
  if (!line.categoryId) {
    throw new Error(
      "TRANSACTION_LINE_CATEGORY_REQUIRED",
    );
  }

  const amountResult =
    calculateLineAmounts(line);

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

    productId:
      line.productId ?? "",

    productName:
      line.productName ?? "",

    productType:
      line.productType === "fuel"
        ? "fuel"
        : "standard",

    fuelType:
      line.productType === "fuel"
        ? line.fuelType ?? "other"
        : "",

    liters:
      line.productType === "fuel"
        ? line.liters
        : "",

    fuelUnitPrice:
      line.productType === "fuel"
        ? line.fuelUnitPrice
        : "",

    vehicleId:
      line.productType === "fuel"
        ? line.vehicleId?.trim() ??
          ""
        : "",

    odometer:
      line.productType === "fuel"
        ? line.odometer
        : "",

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
      line.unitType ?? "adet",

    unitPrice:
      line.unitPrice,

    note:
      line.note?.trim() ?? "",

    ...amountResult,
  };
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
      prepareExpenseLine,
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

    productId:
      line.productId ?? "",

    productName:
      line.productName ?? "",

    productType:
      line.productType === "fuel"
        ? "fuel"
        : "standard",

    fuelType:
      line.fuelType ?? "",

    liters:
      Number(
        line.liters ??
          line.normalizedQuantity ??
          0,
      ),

    fuelUnitPriceMinor:
      Number.isInteger(
        line.fuelUnitPriceMinor,
      )
        ? line.fuelUnitPriceMinor
        : Number.isInteger(
              line.normalizedUnitPriceMinor,
            )
          ? line.normalizedUnitPriceMinor
          : 0,

    vehicleId:
      line.vehicleId ?? "",

    odometer:
      Number(
        line.odometer ?? 0,
      ),

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
        line.normalizedQuantity ?? 0,
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

    refundedMinor:
      Number.isInteger(
        line.refundedMinor,
      )
        ? line.refundedMinor
        : 0,

    refundStatus:
      line.refundStatus ?? "none",

    note:
      line.note ?? "",

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

  const lines =
    Array.isArray(
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
        Number(
          line.netAmountMinor ?? 0,
        ),
      0,
    );

  const amountMinor =
    Number.isInteger(
      data.amountMinor,
    )
      ? data.amountMinor
      : calculatedLinesTotalMinor;

  return {
    id:
      transactionDocument.id,

    ownerId:
      data.ownerId ?? "",

    transactionType:
      data.transactionType ?? "",

    category:
      data.category ?? "",

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

    amount:
      amountMinor / 100,

    amountMinor,

    transactionMode:
      data.transactionMode ??
      (
        lines.length > 1
          ? "multiLine"
          : "singleLine"
      ),

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

    description:
      data.description ?? "",

    paymentMethod:
      data.paymentMethod ?? "",

    creditCardId:
      data.creditCardId ?? "",

    creditCardName:
      data.creditCardName ?? "",

    installmentType:
      data.installmentType ?? "none",

    installmentCount:
      Number(
        data.installmentCount ?? 0,
      ),

    installmentPlanId:
      data.installmentPlanId ?? "",

    statementDate:
      data.statementDate ?? "",

    postingDate:
      data.postingDate ?? "",

    statementEffectiveDate:
      data.statementEffectiveDate ??
      data.transactionDate ??
      "",

    statementEstimated:
      Boolean(
        data.statementEstimated,
      ),

    statementCycleStart:
      data.statementCycleStart ??
      "",

    statementCycleEnd:
      data.statementCycleEnd ??
      data.statementDate ??
      "",

    statementInclusionRule:
      data.statementInclusionRule ??
      "include-closing-day",

    statementStatus:
      getCurrentStatementStatus(
        data.statementCycleEnd ??
          data.statementDate ??
          "",
        data.statementStatus,
      ),

    dueDate:
      data.dueDate ?? "",

    isManualDueDate:
      Boolean(
        data.isManualDueDate,
      ),

    transactionDate:
      data.transactionDate ?? "",

    merchantId:
      data.merchantId ?? "",

    merchantName:
      data.merchantName ?? "",

    branchId:
      data.branchId ?? "",

    branchName:
      data.branchName ?? "",

    originalTransactionId:
      data.originalTransactionId ?? "",

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

    refundedLines:
      Array.isArray(
        data.refundedLines,
      )
        ? data.refundedLines
        : [],

    createdAtUtc:
      convertTimestampToIsoString(
        data.createdAtUtc,
      ),

    updatedAtUtc:
      convertTimestampToIsoString(
        data.updatedAtUtc,
      ),

    createdBy:
      data.createdBy ?? "",

    updatedBy:
      data.updatedBy ?? "",

    isDeleted:
      Boolean(
        data.isDeleted,
      ),

    version:
      Number(
        data.version ?? 1,
      ),
  };
}

// =====================================================
// 11.GÜN
// Kredi kartı giderinin tek çekim veya taksitli ödeme
// bilgilerinin güvenli bir şekilde hazırlanması sağlandı.
// =====================================================

function prepareInstallmentSettings(
  transaction,
) {
  if (
    transaction.paymentMethod !==
    "Kredi Kartı"
  ) {
    return {
      installmentType: "none",

      installmentCount: 0,
    };
  }

  const installmentType =
    transaction.installmentType ===
    "installment"
      ? "installment"
      : "single";

  if (
    installmentType ===
    "single"
  ) {
    return {
      installmentType: "single",

      installmentCount: 1,
    };
  }

  const installmentCount =
    Number(
      transaction.installmentCount,
    );

  if (
    !Number.isInteger(
      installmentCount,
    ) ||
    installmentCount < 2 ||
    installmentCount > 36
  ) {
    throw new Error(
      "TRANSACTION_INSTALLMENT_COUNT_INVALID",
    );
  }

  return {
    installmentType,

    installmentCount,
  };
}

export async function createTransaction(
  userId,
  transaction,
) {
  if (!userId) {
    throw new Error(
      "TRANSACTION_USER_REQUIRED",
    );
  }

  if (
    !transaction.transactionDate
  ) {
    throw new Error(
      "TRANSACTION_DATE_REQUIRED",
    );
  }

  if (
    !transaction.paymentMethod
  ) {
    throw new Error(
      "TRANSACTION_PAYMENT_METHOD_REQUIRED",
    );
  }

  const isExpense =
    transaction.transactionType ===
    "Gider";

  let transactionData;

  if (isExpense) {
    const preparedLines =
      prepareExpenseLines(
        transaction,
      );

    const totals =
      calculateExpenseTotals(
        preparedLines,
      );

    if (
      totals.amountMinor <= 0
    ) {
      throw new Error(
        "TRANSACTION_INVALID_AMOUNT",
      );
    }

    if (
      transaction.paymentMethod ===
        "Kredi Kartı" &&
      !transaction.creditCardId
    ) {
      throw new Error(
        "TRANSACTION_CREDIT_CARD_REQUIRED",
      );
    }

    validateTransactionTotals({
      lines:
        preparedLines,

      amountMinor:
        totals.amountMinor,
    });

    const firstLine =
      preparedLines[0];

    const uniqueCategoryIds =
      new Set(
        preparedLines.map(
          (line) =>
            line.categoryId,
        ),
      );

    const hasMultipleCategories =
      uniqueCategoryIds.size >
      1;

    const installmentSettings =
      prepareInstallmentSettings(
        transaction,
      );

    transactionData = {
      ...createDefaultAuditFields(
        userId,
      ),

      transactionType:
        "Gider",

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

      categoryType:
        "expense",

      transactionMode:
        preparedLines.length > 1
          ? "multiLine"
          : "singleLine",

      lines:
        preparedLines.map(
          (line) => ({
            ...line,

            refundedMinor: 0,

            refundStatus:
              "none",
          }),
        ),

      ...totals,

      couponCode:
        transaction.couponCode?.trim() ??
        "",

      description:
        transaction.description?.trim() ??
        "",

      paymentMethod:
        transaction.paymentMethod,

      creditCardId:
        transaction.paymentMethod ===
        "Kredi Kartı"
          ? transaction.creditCardId ??
            ""
          : "",

      creditCardName:
        transaction.paymentMethod ===
        "Kredi Kartı"
          ? transaction.creditCardName ??
            ""
          : "",

      installmentType:
        installmentSettings.installmentType,

      installmentCount:
        installmentSettings.installmentCount,

      installmentPlanId: "",

      statementDate: "",

      postingDate:
        transaction.postingDate ??
        "",

      statementEffectiveDate: "",

      statementEstimated: false,

      statementCycleStart: "",

      statementCycleEnd: "",

      statementInclusionRule:
        "include-closing-day",

      statementStatus: "",

      dueDate: "",

      isManualDueDate: false,

      transactionDate:
        transaction.transactionDate,

      merchantId:
        transaction.merchantId ??
        "",

      merchantName:
        transaction.merchantName ??
        "",

      branchId:
        transaction.branchId ??
        "",

      branchName:
        transaction.branchName ??
        "",

      refundedMinor: 0,

      refundStatus: "none",

      originalTransactionId: "",

      refundReason: "",

      refundedLines: [],
    };
  } else {
    if (
      !transaction.categoryId
    ) {
      throw new Error(
        "TRANSACTION_CATEGORY_REQUIRED",
      );
    }

    const amountMinor =
      convertAmountToMinor(
        transaction.amount,
      );

    transactionData = {
      ...createDefaultAuditFields(
        userId,
      ),

      transactionType:
        "Gelir",

      category:
        transaction.category ||
        "Genel Gelir",

      categoryId:
        transaction.categoryId,

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

      description:
        transaction.description?.trim() ??
        "",

      paymentMethod:
        transaction.paymentMethod,

      creditCardId: "",

      creditCardName: "",

      installmentType: "none",

      installmentCount: 0,

      installmentPlanId: "",

      statementDate: "",

      postingDate: "",

      statementEffectiveDate: "",

      statementEstimated: false,

      statementCycleStart: "",

      statementCycleEnd: "",

      statementInclusionRule: "",

      statementStatus: "",

      dueDate: "",

      isManualDueDate: false,

      transactionDate:
        transaction.transactionDate,

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

  const transactionReference =
    doc(
      collection(
        db,
        "users",
        userId,
        "transactions",
      ),
    );

  const isCreditCardExpense =
    transactionData.transactionType ===
      "Gider" &&
    transactionData.paymentMethod ===
      "Kredi Kartı";

  const isInstallmentExpense =
    isCreditCardExpense &&
    transactionData.installmentType ===
      "installment";

  const installmentPlanReference =
    isInstallmentExpense
      ? doc(
          collection(
            db,
            "users",
            userId,
            "installmentPlans",
          ),
        )
      : null;

  // =====================================================
  // 11.GÜN
  // Kredi kartı gideri, taksit planı ve ekstre dönemi
  // aynı Firestore transaction içerisinde kaydedilir.
  // =====================================================

  await runTransaction(
    db,
    async (
      firestoreTransaction,
    ) => {
      let statementDate = "";

      let statementPeriod = null;

      let installmentSchedule = [];

      const statementWrites = [];

      if (
        isCreditCardExpense
      ) {
        const creditCardReference =
          doc(
            db,
            "users",
            userId,
            "creditCards",
            transactionData.creditCardId,
          );

        const creditCardSnapshot =
          await firestoreTransaction.get(
            creditCardReference,
          );

        if (
          !creditCardSnapshot.exists()
        ) {
          throw new Error(
            "TRANSACTION_CREDIT_CARD_REQUIRED",
          );
        }

        const creditCardData =
          creditCardSnapshot.data();

        if (
          creditCardData.isDeleted ||
          creditCardData.isActive ===
            false
        ) {
          throw new Error(
            "TRANSACTION_CREDIT_CARD_REQUIRED",
          );
        }

        const statementDay =
          creditCardData.statementDay ??
          31;

        const dueDay =
          creditCardData.dueDay ??
          10;

        statementPeriod =
          calculateStatementPeriod({
            transactionDate:
              transactionData.transactionDate,

            postingDate:
              transactionData.postingDate,

            statementDay,

            dueDay,

            manualDueDate:
              transaction.manualDueDate ??
              "",

            inclusionRule:
              "include-closing-day",
          });

        statementDate =
          statementPeriod.cycleEnd;

        if (
          isInstallmentExpense
        ) {
          installmentSchedule =
            createInstallmentSchedule({
              totalAmountMinor:
                transactionData.amountMinor,

              installmentCount:
                transactionData.installmentCount,

              transactionDate:
                transactionData.transactionDate,

              statementDay,
            });

          // =====================================================
          // 11.GÜN
          // Taksitli harcamada her taksit kendi ayının
          // ekstre dönemine ayrı ayrı eklenir.
          // =====================================================

          for (
            const installment
            of installmentSchedule
          ) {
            const installmentStatementPeriod =
              calculateStatementPeriod({
                transactionDate:
                  installment.statementDate,

                postingDate: "",

                statementDay,

                dueDay,

                inclusionRule:
                  "include-closing-day",
              });

            const statementWrite =
              await prepareStatementPeriodWrite({
                firestoreTransaction,

                userId,

                creditCardId:
                  transactionData.creditCardId,

                creditCardName:
                  transactionData.creditCardName,

                statementPeriod:
                  installmentStatementPeriod,

                oneTimePurchasesMinor:
                  0,

                dueInstallmentsMinor:
                  installment.amountMinor,
              });

            statementWrites.push(
              statementWrite,
            );
          }
        } else {
          // 11.GÜN - Tek çekim kredi kartı gideri ilgili ekstre döneminin toplamına eklenir.
          const statementWrite =
            await prepareStatementPeriodWrite({
              firestoreTransaction,

              userId,

              creditCardId:
                transactionData.creditCardId,

              creditCardName:
                transactionData.creditCardName,

              statementPeriod,

              oneTimePurchasesMinor:
                transactionData.amountMinor,

              dueInstallmentsMinor:
                0,
            });

          statementWrites.push(
            statementWrite,
          );
        }
      }

      const finalTransactionData = {
        ...transactionData,

        statementDate,

        statementEffectiveDate:
          statementPeriod?.effectiveDate ??
          "",

        statementEstimated:
          statementPeriod?.estimated ??
          false,

        statementCycleStart:
          statementPeriod?.cycleStart ??
          "",

        statementCycleEnd:
          statementPeriod?.cycleEnd ??
          "",

        statementInclusionRule:
          statementPeriod?.inclusionRule ??
          "",

        statementStatus:
          statementPeriod?.status ??
          "",

        dueDate:
          statementPeriod?.dueDate ??
          "",

        isManualDueDate:
          statementPeriod?.isManualDueDate ??
          false,

        installmentPlanId:
          installmentPlanReference?.id ??
          "",

        createdAtUtc:
          serverTimestamp(),

        updatedAtUtc:
          serverTimestamp(),
      };

      firestoreTransaction.set(
        transactionReference,
        finalTransactionData,
      );

      if (
        installmentPlanReference
      ) {
        firestoreTransaction.set(
          installmentPlanReference,
          {
            ...createDefaultAuditFields(
              userId,
            ),

            sourceTransactionId:
              transactionReference.id,

            creditCardId:
              transactionData.creditCardId,

            creditCardName:
              transactionData.creditCardName,

            totalAmountMinor:
              transactionData.amountMinor,

            installmentCount:
              transactionData.installmentCount,

            firstStatementDate:
              statementDate,

            transactionDate:
              transactionData.transactionDate,

            installments:
              installmentSchedule,

            createdAtUtc:
              serverTimestamp(),

            updatedAtUtc:
              serverTimestamp(),
          },
        );
      }

      // 11.GÜN - Hazırlanan ekstre dönemleri aynı atomik işlem içerisinde Firestore'a yazılır.
      statementWrites.forEach(
        (
          statementWrite,
        ) => {
          writeStatementPeriod({
            firestoreTransaction,

            statementReference:
              statementWrite.statementReference,

            finalData:
              statementWrite.finalData,
          });
        },
      );
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

function prepareRefundLines(
  originalLines,
  requestedRefundLines,
) {
  if (
    !Array.isArray(
      requestedRefundLines,
    ) ||
    requestedRefundLines.length ===
      0
  ) {
    return [];
  }

  return requestedRefundLines.map(
    (
      requestedLine,
    ) => {
      const originalLine =
        originalLines.find(
          (line) =>
            line.id ===
            requestedLine.lineId,
        );

      if (!originalLine) {
        throw new Error(
          "TRANSACTION_REFUND_LINE_INVALID",
        );
      }

      const refundAmountMinor =
        convertAmountToMinor(
          requestedLine.amount,
        );

      const currentLineRefundedMinor =
        Number(
          originalLine.refundedMinor ??
            0,
        );

      const remainingLineMinor =
        Number(
          originalLine.netAmountMinor ??
            0,
        ) -
        currentLineRefundedMinor;

      if (
        refundAmountMinor >
        remainingLineMinor
      ) {
        throw new Error(
          "TRANSACTION_REFUND_EXCEEDS_REMAINING",
        );
      }

      return {
        lineId:
          originalLine.id,

        productId:
          originalLine.productId ??
          "",

        productName:
          originalLine.productName ??
          "",

        categoryId:
          originalLine.categoryId ??
          "",

        category:
          originalLine.category ??
          "",

        amountMinor:
          refundAmountMinor,
      };
    },
  );
}

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

      if (
        originalData.isDeleted
      ) {
        throw new Error(
          "REFUND_ORIGINAL_NOT_FOUND",
        );
      }

      const originalLines =
        Array.isArray(
          originalData.lines,
        )
          ? originalData.lines
          : [];

      const preparedRefundLines =
        prepareRefundLines(
          originalLines,
          refund.refundedLines,
        );

      const refundAmountMinor =
        preparedRefundLines.length >
        0
          ? preparedRefundLines.reduce(
              (
                total,
                line,
              ) =>
                total +
                line.amountMinor,
              0,
            )
          : convertAmountToMinor(
              refund.amount,
            );

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
        refundAmountMinor <= 0 ||
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

      const newRefundStatus =
        calculateRefundStatus(
          originalAmountMinor,
          newRefundedMinor,
        );

      let updatedOriginalLines =
        originalLines;

      if (
        preparedRefundLines.length >
        0
      ) {
        updatedOriginalLines =
          originalLines.map(
            (
              originalLine,
            ) => {
              const relatedRefundLine =
                preparedRefundLines.find(
                  (
                    refundLine,
                  ) =>
                    refundLine.lineId ===
                    originalLine.id,
                );

              if (
                !relatedRefundLine
              ) {
                return originalLine;
              }

              const newLineRefundedMinor =
                Number(
                  originalLine.refundedMinor ??
                    0,
                ) +
                relatedRefundLine.amountMinor;

              return {
                ...originalLine,

                refundedMinor:
                  newLineRefundedMinor,

                refundStatus:
                  calculateRefundStatus(
                    Number(
                      originalLine.netAmountMinor ??
                        0,
                    ),
                    newLineRefundedMinor,
                  ),
              };
            },
          );
      }

      let statementRefundWrite =
        null;

      // =====================================================
      // 11.GÜN
      // Kredi kartı iadesinde ilgili ekstre kaydı bulunursa
      // iade tutarı ekstre toplamından düşürülür.
      // =====================================================

      if (
        originalData.paymentMethod ===
          "Kredi Kartı" &&
        originalData.creditCardId &&
        originalData.statementCycleEnd
      ) {
        statementRefundWrite =
          await prepareStatementRefundWrite({
            firestoreTransaction,

            userId,

            creditCardId:
              originalData.creditCardId,

            cycleEnd:
              originalData.statementCycleEnd,

            refundAmountMinor,
          });
      }

      firestoreTransaction.update(
        originalTransactionReference,
        {
          refundedMinor:
            newRefundedMinor,

          refundStatus:
            newRefundStatus,

          lines:
            updatedOriginalLines,

          updatedBy:
            userId,

          updatedAtUtc:
            serverTimestamp(),

          version:
            Number(
              originalData.version ??
                1,
            ) + 1,
        },
      );

      firestoreTransaction.set(
        refundTransactionReference,
        {
          ...createDefaultAuditFields(
            userId,
          ),

          transactionType:
            "İade",

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

          categoryType:
            "expense",

          amountMinor:
            refundAmountMinor,

          subtotalMinor:
            refundAmountMinor,

          transactionMode:
            preparedRefundLines.length >
            1
              ? "multiLine"
              : "singleLine",

          lines: [],

          lineDiscountTotalMinor: 0,

          transactionDiscountMinor: 0,

          couponCode: "",

          description: "",

          paymentMethod:
            refund.paymentMethod ??
            originalData.paymentMethod ??
            "",

          creditCardId:
            originalData.creditCardId ??
            "",

          creditCardName:
            originalData.creditCardName ??
            "",

          installmentType:
            "none",

          installmentCount: 0,

          installmentPlanId: "",

          statementDate:
            originalData.statementDate ??
            "",

          postingDate:
            originalData.postingDate ??
            "",

          statementEffectiveDate:
            originalData.statementEffectiveDate ??
            "",

          statementEstimated:
            Boolean(
              originalData.statementEstimated,
            ),

          statementCycleStart:
            originalData.statementCycleStart ??
            "",

          statementCycleEnd:
            originalData.statementCycleEnd ??
            "",

          statementInclusionRule:
            originalData.statementInclusionRule ??
            "",

          statementStatus:
            originalData.statementStatus ??
            "",

          dueDate:
            originalData.dueDate ??
            "",

          isManualDueDate:
            Boolean(
              originalData.isManualDueDate,
            ),

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

          refundStatus:
            "none",

          refundReason:
            refund.reason?.trim() ??
            "",

          refundedLines:
            preparedRefundLines,

          createdAtUtc:
            serverTimestamp(),

          updatedAtUtc:
            serverTimestamp(),
        },
      );

      if (
        statementRefundWrite
      ) {
        writeStatementPeriod({
          firestoreTransaction,

          statementReference:
            statementRefundWrite.statementReference,

          finalData:
            statementRefundWrite.finalData,
        });
      }
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

export async function archiveTransaction(
  userId,
  transactionId,
) {
  const transactionReference =
    doc(
      db,
      "users",
      userId,
      "transactions",
      transactionId,
    );

  const transactionSnapshot =
    await getDoc(
      transactionReference,
    );

  if (
    !transactionSnapshot.exists()
  ) {
    throw new Error(
      "TRANSACTION_NOT_FOUND",
    );
  }

  const transactionData =
    transactionSnapshot.data();

  await updateDoc(
    transactionReference,
    {
      isDeleted: true,

      updatedBy:
        userId,

      updatedAtUtc:
        serverTimestamp(),

      version:
        Number(
          transactionData.version ??
            1,
        ) + 1,
    },
  );

  return transactionId;
}

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

  return transactionsSnapshot.docs
    .map(
      mapTransactionDocument,
    )
    .filter(
      (
        transaction,
      ) =>
        !transaction.isDeleted,
    );
}