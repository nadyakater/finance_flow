// =====================================================
// 7.GÜN
// Gider satırı, miktar normalizasyonu ve fiyat analizi
// hesaplamaları bu dosyada toplandı.
//
// Böylece hesaplamalar component veya Firebase repository
// içerisinde tekrar tekrar yapılmayacak.
// =====================================================

const UNIT_DEFINITIONS = {
  ml: {
    normalizedUnit: "L",
    multiplier: 0.001,
  },

  l: {
    normalizedUnit: "L",
    multiplier: 1,
  },

  g: {
    normalizedUnit: "kg",
    multiplier: 0.001,
  },

  kg: {
    normalizedUnit: "kg",
    multiplier: 1,
  },

  piece: {
    normalizedUnit: "adet",
    multiplier: 1,
  },

  adet: {
    normalizedUnit: "adet",
    multiplier: 1,
  },
};

export function convertAmountToMinor(amount) {
  const normalizedAmount =
    typeof amount === "string" ? amount.replace(",", ".") : amount;

  const numericAmount = Number(normalizedAmount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("TRANSACTION_INVALID_AMOUNT");
  }

  return Math.round(numericAmount * 100);
}

export function convertOptionalAmountToMinor(amount) {
  if (amount === "" || amount === null || amount === undefined) {
    return 0;
  }

  const normalizedAmount =
    typeof amount === "string" ? amount.replace(",", ".") : amount;

  const numericAmount = Number(normalizedAmount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("TRANSACTION_INVALID_DISCOUNT");
  }

  return Math.round(numericAmount * 100);
}

export function convertPositiveNumber(value, fallbackValue = 1) {
  if (value === "" || value === null || value === undefined) {
    return fallbackValue;
  }

  const normalizedValue =
    typeof value === "string" ? value.replace(",", ".") : value;

  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error("TRANSACTION_INVALID_QUANTITY");
  }

  return numericValue;
}

export function normalizeUnitType(unitType) {
  const normalizedUnitType = String(unitType ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR");

  if (normalizedUnitType === "litre" || normalizedUnitType === "liter") {
    return "l";
  }

  if (normalizedUnitType === "kilogram") {
    return "kg";
  }

  if (normalizedUnitType === "gram") {
    return "g";
  }

  if (
    normalizedUnitType === "mililitre" ||
    normalizedUnitType === "mililiter"
  ) {
    return "ml";
  }

  if (normalizedUnitType === "tane") {
    return "adet";
  }

  return normalizedUnitType;
}

// Örnek:
//
// 2 paket
// Her pakette 6 adet
// Her adet 200 ml
//
// 2 × 6 × 200 = 2400 ml
// 2400 ml = 2.4 litre
export function calculateNormalizedQuantity({
  purchaseQuantity,
  unitCount,
  unitSize,
  unitType,
}) {
  const safePurchaseQuantity = convertPositiveNumber(purchaseQuantity, 1);

  const safeUnitCount = convertPositiveNumber(unitCount, 1);

  const safeUnitSize = convertPositiveNumber(unitSize, 1);

  const safeUnitType = normalizeUnitType(unitType);

  const unitDefinition = UNIT_DEFINITIONS[safeUnitType];

  if (!unitDefinition) {
    throw new Error("TRANSACTION_UNSUPPORTED_UNIT");
  }

  const rawQuantity = safePurchaseQuantity * safeUnitCount * safeUnitSize;

  const normalizedQuantity = rawQuantity * unitDefinition.multiplier;

  return {
    purchaseQuantity: safePurchaseQuantity,

    unitCount: safeUnitCount,

    unitSize: safeUnitSize,

    unitType: safeUnitType,

    normalizedQuantity: Number(normalizedQuantity.toFixed(6)),

    normalizedUnit: unitDefinition.normalizedUnit,
  };
}

export function calculateProductMetrics(line, netAmountMinor) {
  const hasProductInformation = Boolean(line.productId || line.productName);

  if (!hasProductInformation) {
    return {
      purchaseQuantity: 0,
      unitCount: 0,
      unitSize: 0,
      unitType: "",
      normalizedQuantity: 0,
      normalizedUnit: "",
      unitPriceMinor: 0,
      normalizedUnitPriceMinor: 0,
    };
  }

  // 8.GÜN
  // Yakıt ürünleri litre üzerinden normalleştirilir.
  if (line.productType === "fuel") {
    const liters = convertPositiveNumber(line.liters, 0);

    const enteredUnitPriceMinor = convertOptionalAmountToMinor(
      line.fuelUnitPrice,
    );

    const calculatedFuelUnitPriceMinor = Math.round(netAmountMinor / liters);

    return {
      purchaseQuantity: liters,

      unitCount: 1,

      unitSize: 1,

      unitType: "l",

      normalizedQuantity: Number(liters.toFixed(3)),

      normalizedUnit: "L",

      unitPriceMinor:
        enteredUnitPriceMinor > 0
          ? enteredUnitPriceMinor
          : calculatedFuelUnitPriceMinor,

      normalizedUnitPriceMinor:
        enteredUnitPriceMinor > 0
          ? enteredUnitPriceMinor
          : calculatedFuelUnitPriceMinor,

      productType: "fuel",

      fuelType: line.fuelType ?? "other",

      liters: Number(liters.toFixed(3)),

      fuelUnitPriceMinor:
        enteredUnitPriceMinor > 0
          ? enteredUnitPriceMinor
          : calculatedFuelUnitPriceMinor,

      vehicleId: line.vehicleId?.trim() ?? "",

      odometer: Number(line.odometer ?? 0),
    };
  }

  const quantityResult = calculateNormalizedQuantity({
    purchaseQuantity: line.purchaseQuantity,

    unitCount: line.unitCount,

    unitSize: line.unitSize,

    unitType: line.unitType || "adet",
  });

  const enteredUnitPriceMinor = convertOptionalAmountToMinor(line.unitPrice);

  // Bir paket/adet başına ödenen fiyat.
  const calculatedUnitPriceMinor = Math.round(
    netAmountMinor / quantityResult.purchaseQuantity,
  );

  // Litre, kilogram veya adet başına
  // normalize edilmiş fiyat.
  const normalizedUnitPriceMinor =
    quantityResult.normalizedQuantity > 0
      ? Math.round(netAmountMinor / quantityResult.normalizedQuantity)
      : 0;

  return {
    ...quantityResult,

    unitPriceMinor:
      enteredUnitPriceMinor > 0
        ? enteredUnitPriceMinor
        : calculatedUnitPriceMinor,

    normalizedUnitPriceMinor,
  };
}

export function calculateLineAmounts(line) {
  const grossAmountMinor = convertAmountToMinor(line.amount);

  const lineDiscountMinor = convertOptionalAmountToMinor(line.discount);

  if (lineDiscountMinor > grossAmountMinor) {
    throw new Error("TRANSACTION_INVALID_DISCOUNT");
  }

  return {
    grossAmountMinor,

    lineDiscountMinor,

    amountAfterLineDiscountMinor: grossAmountMinor - lineDiscountMinor,
  };
}

export function allocateTransactionDiscount(lines, transactionDiscountMinor) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("TRANSACTION_LINE_REQUIRED");
  }

  const totalAfterLineDiscountMinor = lines.reduce(
    (total, line) => total + line.amountAfterLineDiscountMinor,
    0,
  );

  if (transactionDiscountMinor > totalAfterLineDiscountMinor) {
    throw new Error("TRANSACTION_INVALID_DISCOUNT");
  }

  if (transactionDiscountMinor === 0) {
    return lines.map((line) => {
      const netAmountMinor = line.amountAfterLineDiscountMinor;

      return {
        ...line,

        allocatedTransactionDiscountMinor: 0,

        netAmountMinor,

        ...calculateProductMetrics(line, netAmountMinor),
      };
    });
  }

  const discountShares = lines.map((line, index) => {
    const exactNumerator =
      transactionDiscountMinor * line.amountAfterLineDiscountMinor;

    return {
      index,

      allocatedMinor: Math.floor(exactNumerator / totalAfterLineDiscountMinor),

      remainder: exactNumerator % totalAfterLineDiscountMinor,
    };
  });

  const allocatedTotalMinor = discountShares.reduce(
    (total, share) => total + share.allocatedMinor,
    0,
  );

  let remainingDiscountMinor = transactionDiscountMinor - allocatedTotalMinor;

  const orderedShares = [...discountShares].sort(
    (firstShare, secondShare) =>
      secondShare.remainder - firstShare.remainder ||
      firstShare.index - secondShare.index,
  );

  for (
    let index = 0;
    index < orderedShares.length && remainingDiscountMinor > 0;
    index += 1
  ) {
    orderedShares[index].allocatedMinor += 1;

    remainingDiscountMinor -= 1;
  }

  return lines.map((line, index) => {
    const relatedShare = discountShares.find((share) => share.index === index);

    const allocatedTransactionDiscountMinor = relatedShare?.allocatedMinor ?? 0;

    const netAmountMinor =
      line.amountAfterLineDiscountMinor - allocatedTransactionDiscountMinor;

    return {
      ...line,

      allocatedTransactionDiscountMinor,

      netAmountMinor,

      ...calculateProductMetrics(line, netAmountMinor),
    };
  });
}

export function calculateExpenseTotals(lines) {
  const subtotalMinor = lines.reduce(
    (total, line) => total + Number(line.grossAmountMinor ?? 0),
    0,
  );

  const lineDiscountTotalMinor = lines.reduce(
    (total, line) => total + Number(line.lineDiscountMinor ?? 0),
    0,
  );

  const transactionDiscountMinor = lines.reduce(
    (total, line) =>
      total + Number(line.allocatedTransactionDiscountMinor ?? 0),
    0,
  );

  const amountMinor = lines.reduce(
    (total, line) => total + Number(line.netAmountMinor ?? 0),
    0,
  );

  return {
    subtotalMinor,
    lineDiscountTotalMinor,
    transactionDiscountMinor,
    amountMinor,
  };
}

// Transaction toplamı ile satır toplamı
// birbirinden farklıysa kayıt oluşturulmaz.
export function validateTransactionTotals({ lines, amountMinor }) {
  const lineTotalMinor = lines.reduce(
    (total, line) => total + Number(line.netAmountMinor ?? 0),
    0,
  );

  if (lineTotalMinor !== amountMinor) {
    throw new Error("TRANSACTION_TOTAL_MISMATCH");
  }

  return true;
}

export function calculateRefundStatus(originalAmountMinor, refundedMinor) {
  const safeOriginalAmount = Number(originalAmountMinor ?? 0);

  const safeRefundedAmount = Number(refundedMinor ?? 0);

  if (safeRefundedAmount <= 0) {
    return "none";
  }

  if (safeRefundedAmount >= safeOriginalAmount) {
    return "full";
  }

  return "partial";
}

export function formatMinorAmount(amountMinor) {
  return (Number(amountMinor ?? 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
