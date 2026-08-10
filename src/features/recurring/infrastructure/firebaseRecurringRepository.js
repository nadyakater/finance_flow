import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";

import {
  calculateNextDueDate,
  createAmountHistoryEntry,
  createForecastItem,
  getTodayDateValue,
} from "../domain/recurringCalculations";

// =====================================================
// 11.GÜN - Düzenli gider repository
//
// Kira, internet, sigorta ve abonelik gibi tekrar eden
// ödemelerin Firestore işlemleri bu dosyada yönetilir.
//
// Bu dosyada:
//
// - recurring rule oluşturma
// - recurring rule listeleme
// - forecast kaydı oluşturma
// - forecast güncelleme
// - tutar geçmişi saklama
//
// işlemleri yapılır.
// =====================================================

// =====================================================
// 11.GÜN
// Kullanıcının recurring rule koleksiyonuna erişim sağlar.
//
// Firestore yolu:
//
// users/{userId}/recurringRules
// =====================================================

function getRecurringRulesCollection(userId) {
  return collection(db, "users", userId, "recurringRules");
}

// =====================================================
// 11.GÜN
// Belirli bir recurring rule belgesine erişim sağlar.
// =====================================================

function getRecurringRuleReference(userId, recurringRuleId) {
  return doc(db, "users", userId, "recurringRules", recurringRuleId);
}

// =====================================================
// 11.GÜN
// Bir recurring rule'a ait forecast kayıtlarının
// saklandığı alt koleksiyona erişir.
//
// Firestore yolu:
//
// users/{userId}/recurringRules/{ruleId}/forecasts
// =====================================================

function getForecastCollection(userId, recurringRuleId) {
  return collection(
    db,
    "users",
    userId,
    "recurringRules",
    recurringRuleId,
    "forecasts",
  );
}

// =====================================================
// 11.GÜN
// Tek bir forecast kaydının referansını oluşturur.
// =====================================================

function getForecastReference(userId, recurringRuleId, forecastId) {
  return doc(
    db,
    "users",
    userId,
    "recurringRules",
    recurringRuleId,
    "forecasts",
    forecastId,
  );
}

// =====================================================
// 11.GÜN
// Firestore Timestamp değerini ISO metne çevirir.
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
// 11.GÜN
// Firestore recurring rule belgesini uygulamada
// kullanacağımız sade veri yapısına dönüştürür.
// =====================================================

function mapRecurringRuleDocument(recurringRuleDocument) {
  const data = recurringRuleDocument.data();

  return {
    id: recurringRuleDocument.id,

    ownerId: data.ownerId ?? "",

    name: data.name ?? "",

    categoryId: data.categoryId ?? "",

    categoryPath: data.categoryPath ?? "",

    recurringType: data.recurringType ?? "expense",

    frequency: data.frequency ?? "monthly",

    recurringDay: Number(data.recurringDay ?? 1),

    estimatedAmountMinor: Number(data.estimatedAmountMinor ?? 0),

    currency: data.currency ?? "TRY",

    isActive: data.isActive !== false,

    amountHistory: Array.isArray(data.amountHistory) ? data.amountHistory : [],

    createdAtUtc: convertTimestampToIsoString(data.createdAtUtc),

    updatedAtUtc: convertTimestampToIsoString(data.updatedAtUtc),

    createdBy: data.createdBy ?? "",

    updatedBy: data.updatedBy ?? "",

    version: Number(data.version ?? 1),
  };
}

// =====================================================
// 11.GÜN
// Firestore forecast belgesini uygulamada kullanılacak
// sade veri yapısına dönüştürür.
// =====================================================

function mapForecastDocument(forecastDocument) {
  const data = forecastDocument.data();

  return {
    id: forecastDocument.id,

    recurringRuleId: data.recurringRuleId ?? "",

    dueDate: data.dueDate ?? "",

    estimatedAmountMinor: Number(data.estimatedAmountMinor ?? 0),

    actualAmountMinor:
      data.actualAmountMinor === null || data.actualAmountMinor === undefined
        ? null
        : Number(data.actualAmountMinor),

    paidAt: data.paidAt ?? null,

    status: data.status ?? "forecast",

    overdue: Boolean(data.overdue),

    transactionId: data.transactionId ?? "",

    createdAtUtc: convertTimestampToIsoString(data.createdAtUtc),

    updatedAtUtc: convertTimestampToIsoString(data.updatedAtUtc),
  };
}

// =====================================================
// 11.GÜN
// Yeni düzenli gider kuralı oluşturur.
//
// Örneğin:
//
// İnternet
// Her ayın 15'i
// Tahmini 600 TL
//
// gibi bir kural Firestore'a kaydedilir.
// =====================================================

export async function createRecurringRule(
  userId,
  { name, categoryId, categoryPath, recurringDay, estimatedAmountMinor },
) {
  if (!userId) {
    throw new Error("RECURRING_USER_REQUIRED");
  }

  if (!name?.trim()) {
    throw new Error("RECURRING_NAME_REQUIRED");
  }

  const recurringRulesCollection = getRecurringRulesCollection(userId);

  const todayDate = getTodayDateValue();

  // =====================================================
  // 11.GÜN
  // Düzenli giderin ilk tutar geçmişi kaydı oluşturulur.
  //
  // Böylece ileride tutar değişse bile ilk fiyat geçmişte
  // korunmaya devam eder.
  // =====================================================

  const amountHistoryEntry = createAmountHistoryEntry({
    amountMinor: estimatedAmountMinor,

    effectiveFrom: todayDate,
  });

  const recurringRuleDocument = await addDoc(recurringRulesCollection, {
    ownerId: userId,

    name: name.trim(),

    categoryId: categoryId ?? "",

    categoryPath: categoryPath ?? "",

    recurringType: "expense",

    frequency: "monthly",

    recurringDay: Number(recurringDay),

    estimatedAmountMinor: Number(estimatedAmountMinor),

    currency: "TRY",

    isActive: true,

    amountHistory: [amountHistoryEntry],

    createdAtUtc: serverTimestamp(),

    updatedAtUtc: serverTimestamp(),

    createdBy: userId,

    updatedBy: userId,

    version: 1,
  });

  const createdSnapshot = await getDoc(recurringRuleDocument);

  return mapRecurringRuleDocument(createdSnapshot);
}

// =====================================================
// 11.GÜN
// Kullanıcının bütün düzenli gider kurallarını getirir.
// =====================================================

export async function getRecurringRules(userId) {
  if (!userId) {
    throw new Error("RECURRING_USER_REQUIRED");
  }

  const recurringRulesQuery = query(
    getRecurringRulesCollection(userId),

    orderBy("createdAtUtc", "desc"),
  );

  const recurringRulesSnapshot = await getDocs(recurringRulesQuery);

  return recurringRulesSnapshot.docs.map(mapRecurringRuleDocument);
}

// =====================================================
// 11.GÜN
// Düzenli gider için bir sonraki forecast kaydını üretir.
//
// Önemli:
// Bu işlem transaction oluşturmaz.
//
// Sadece gelecekte yapılması beklenen ödeme için
// forecast kaydı oluşturur.
// =====================================================

export async function createNextForecast(userId, recurringRule) {
  if (!userId) {
    throw new Error("RECURRING_USER_REQUIRED");
  }

  if (!recurringRule?.id) {
    throw new Error("RECURRING_RULE_REQUIRED");
  }

  const todayDate = getTodayDateValue();

  const dueDate = calculateNextDueDate({
    recurringDay: recurringRule.recurringDay,

    referenceDate: todayDate,
  });

  const forecastData = createForecastItem({
    recurringRuleId: recurringRule.id,

    dueDate,

    estimatedAmountMinor: recurringRule.estimatedAmountMinor,
  });

  const forecastCollection = getForecastCollection(userId, recurringRule.id);

  // =====================================================
  // 11.GÜN
  // Aynı recurring rule ve aynı dueDate için daha önce
  // forecast oluşturulmuşsa ikinci kez oluşturulmaz.
  //
  // Böylece duplicate forecast oluşması engellenir.
  // =====================================================

  const currentForecasts = await getDocs(forecastCollection);

  const duplicateForecast = currentForecasts.docs.find((forecastDocument) => {
    const data = forecastDocument.data();

    return data.dueDate === dueDate;
  });

  if (duplicateForecast) {
    return mapForecastDocument(duplicateForecast);
  }

  const forecastDocument = await addDoc(forecastCollection, {
    ...forecastData,

    ownerId: userId,

    createdAtUtc: serverTimestamp(),

    updatedAtUtc: serverTimestamp(),
  });

  const createdSnapshot = await getDoc(forecastDocument);

  return mapForecastDocument(createdSnapshot);
}

// =====================================================
// 11.GÜN
// Belirli bir recurring rule'a ait forecast kayıtlarını
// getirir.
// =====================================================

export async function getForecastsForRule(userId, recurringRuleId) {
  if (!userId || !recurringRuleId) {
    return [];
  }

  const forecastsQuery = query(
    getForecastCollection(userId, recurringRuleId),

    orderBy("dueDate", "asc"),
  );

  const forecastsSnapshot = await getDocs(forecastsQuery);

  return forecastsSnapshot.docs.map(mapForecastDocument);
}

// =====================================================
// 11.GÜN
// Forecast kaydı gerçek ödeme bilgisiyle güncellenir.
//
// Bu işlem forecast kaydını silmez.
//
// Tahmini tutar ile gerçek tutar ayrı ayrı korunur.
// =====================================================

export async function markForecastAsPaid(
  userId,
  { recurringRuleId, forecastId, actualAmountMinor, transactionId, paidAt },
) {
  if (!userId || !recurringRuleId || !forecastId) {
    throw new Error("RECURRING_FORECAST_REQUIRED");
  }

  const forecastReference = getForecastReference(
    userId,
    recurringRuleId,
    forecastId,
  );

  const forecastSnapshot = await getDoc(forecastReference);

  if (!forecastSnapshot.exists()) {
    throw new Error("RECURRING_FORECAST_NOT_FOUND");
  }

  const currentData = forecastSnapshot.data();

  // =====================================================
  // 11.GÜN
  // Forecast daha önce gerçek bir transaction'a bağlandıysa
  // tekrar ödeme işlemi yapılmaz.
  //
  // Böylece aynı fatura için duplicate transaction oluşmaz.
  // =====================================================

  if (currentData.transactionId || currentData.status === "paid") {
    throw new Error("RECURRING_FORECAST_ALREADY_PAID");
  }

  await updateDoc(forecastReference, {
    actualAmountMinor: Number(actualAmountMinor),

    paidAt: paidAt ?? getTodayDateValue(),

    status: "paid",

    overdue: false,

    transactionId: transactionId ?? "",

    updatedAtUtc: serverTimestamp(),
  });

  const updatedSnapshot = await getDoc(forecastReference);

  return mapForecastDocument(updatedSnapshot);
}

// =====================================================
// 11.GÜN
// Düzenli giderin tahmini tutarı değiştirildiğinde
// eski tutar silinmez.
//
// Yeni tutar amountHistory içerisine eklenir.
//
// Böylece geçmiş dönemlerde kullanılan eski fiyatlar
// korunur.
// =====================================================

export async function updateRecurringAmount(
  userId,
  { recurringRuleId, newAmountMinor, effectiveFrom },
) {
  if (!userId || !recurringRuleId) {
    throw new Error("RECURRING_RULE_REQUIRED");
  }

  const recurringRuleReference = getRecurringRuleReference(
    userId,
    recurringRuleId,
  );

  const recurringRuleSnapshot = await getDoc(recurringRuleReference);

  if (!recurringRuleSnapshot.exists()) {
    throw new Error("RECURRING_RULE_NOT_FOUND");
  }

  const currentData = recurringRuleSnapshot.data();

  const currentHistory = Array.isArray(currentData.amountHistory)
    ? currentData.amountHistory
    : [];

  // =====================================================
  // 11.GÜN
  // Yeni fiyat için yeni bir geçmiş kaydı oluşturulur.
  // =====================================================

  const newHistoryEntry = createAmountHistoryEntry({
    amountMinor: newAmountMinor,

    effectiveFrom: effectiveFrom ?? getTodayDateValue(),
  });

  await updateDoc(recurringRuleReference, {
    estimatedAmountMinor: Number(newAmountMinor),

    amountHistory: [...currentHistory, newHistoryEntry],

    updatedAtUtc: serverTimestamp(),

    updatedBy: userId,

    version: Number(currentData.version ?? 1) + 1,
  });

  const updatedSnapshot = await getDoc(recurringRuleReference);

  return mapRecurringRuleDocument(updatedSnapshot);
}

// =====================================================
// 11.GÜN
// Düzenli giderin aktiflik durumu değiştirilir.
//
// Kullanıcı artık kullanılmayan bir aboneliği tamamen
// silmek yerine pasif hale getirebilir.
//
// Böylece eski forecast ve fiyat geçmişi kaybolmaz.
// =====================================================

export async function updateRecurringRuleActiveStatus(
  userId,
  recurringRuleId,
  isActive,
) {
  const recurringRuleReference = getRecurringRuleReference(
    userId,
    recurringRuleId,
  );

  await updateDoc(recurringRuleReference, {
    isActive: Boolean(isActive),

    updatedAtUtc: serverTimestamp(),

    updatedBy: userId,
  });

  const updatedSnapshot = await getDoc(recurringRuleReference);

  return mapRecurringRuleDocument(updatedSnapshot);
}
