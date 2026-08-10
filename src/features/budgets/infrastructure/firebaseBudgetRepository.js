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
  validateBudgetAmountMinor,
  validateSavingsTargetPercent,
  validateSavingsTargetType,
} from "../domain/budgetCalculations";

// =====================================================
// 11.GÜN - Bütçe ve hedef repository
//
// Kullanıcının:
//
// - kategori bütçeleri,
// - kategori ağacı bütçeleri,
// - rollover ayarları,
// - tasarruf hedefleri
//
// Firestore işlemleri bu dosyada yönetilir.
// =====================================================

// =====================================================
// 11.GÜN
// Kullanıcının bütçelerinin tutulduğu koleksiyon.
//
// Firestore yolu:
//
// users/{userId}/budgets
// =====================================================

function getBudgetsCollection(userId) {
  return collection(db, "users", userId, "budgets");
}

// =====================================================
// 11.GÜN
// Tek bir bütçe belgesinin referansını oluşturur.
// =====================================================

function getBudgetReference(userId, budgetId) {
  return doc(db, "users", userId, "budgets", budgetId);
}

// =====================================================
// 11.GÜN
// Kullanıcının tasarruf hedeflerinin tutulduğu
// koleksiyona erişir.
//
// Firestore yolu:
//
// users/{userId}/savingsTargets
// =====================================================

function getSavingsTargetsCollection(userId) {
  return collection(db, "users", userId, "savingsTargets");
}

// =====================================================
// 11.GÜN
// Tek bir tasarruf hedefinin referansını oluşturur.
// =====================================================

function getSavingsTargetReference(userId, savingsTargetId) {
  return doc(db, "users", userId, "savingsTargets", savingsTargetId);
}

// =====================================================
// 11.GÜN
// Firestore Timestamp değerini ISO tarih metnine çevirir.
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
// Firestore'dan gelen bütçe belgesini uygulamanın
// kullanacağı sade veri yapısına dönüştürür.
// =====================================================

function mapBudgetDocument(budgetDocument) {
  const data = budgetDocument.data();

  return {
    id: budgetDocument.id,

    ownerId: data.ownerId ?? "",

    categoryId: data.categoryId ?? "",

    categoryName: data.categoryName ?? "",

    categoryPath: data.categoryPath ?? "",

    // =====================================================
    // 11.GÜN
    // true ise parent kategori bütçesi alt kategorilerin
    // giderlerini de kapsar.
    //
    // false ise yalnızca doğrudan seçilen kategori
    // hesaba katılır.
    // =====================================================

    includeDescendants: data.includeDescendants !== false,

    budgetAmountMinor: Number(data.budgetAmountMinor ?? 0),

    // =====================================================
    // 11.GÜN
    // Bütçenin hangi finansal raporlama dönemine ait
    // olduğunu saklarız.
    // =====================================================

    periodStart: data.periodStart ?? "",

    periodEnd: data.periodEnd ?? "",

    reportingMode: data.reportingMode ?? "calendarMonth",

    // =====================================================
    // 11.GÜN
    // Rollover aktifse önceki dönemden kullanılmayan
    // bütçe sonraki döneme aktarılabilir.
    // =====================================================

    rolloverEnabled: Boolean(data.rolloverEnabled),

    rolloverSourceBudgetId: data.rolloverSourceBudgetId ?? "",

    rolloverAmountMinor: Number(data.rolloverAmountMinor ?? 0),

    isActive: data.isActive !== false,

    createdAtUtc: convertTimestampToIsoString(data.createdAtUtc),

    updatedAtUtc: convertTimestampToIsoString(data.updatedAtUtc),

    createdBy: data.createdBy ?? "",

    updatedBy: data.updatedBy ?? "",

    version: Number(data.version ?? 1),
  };
}

// =====================================================
// 11.GÜN
// Firestore'dan gelen tasarruf hedefini uygulamanın
// kullanacağı sade veri yapısına dönüştürür.
// =====================================================

function mapSavingsTargetDocument(targetDocument) {
  const data = targetDocument.data();

  return {
    id: targetDocument.id,

    ownerId: data.ownerId ?? "",

    name: data.name ?? "Tasarruf Hedefi",

    // =====================================================
    // 11.GÜN
    // Hedef tipi:
    //
    // amount
    // incomePercent
    //
    // olarak saklanır.
    // =====================================================

    targetType: data.targetType ?? "amount",

    targetAmountMinor: Number(data.targetAmountMinor ?? 0),

    targetPercent:
      data.targetPercent === null || data.targetPercent === undefined
        ? null
        : Number(data.targetPercent),

    // =====================================================
    // 11.GÜN
    // Tasarruf hedefinin hangi finansal dönemde
    // değerlendirileceğini saklarız.
    // =====================================================

    periodStart: data.periodStart ?? "",

    periodEnd: data.periodEnd ?? "",

    reportingMode: data.reportingMode ?? "calendarMonth",

    isActive: data.isActive !== false,

    createdAtUtc: convertTimestampToIsoString(data.createdAtUtc),

    updatedAtUtc: convertTimestampToIsoString(data.updatedAtUtc),

    createdBy: data.createdBy ?? "",

    updatedBy: data.updatedBy ?? "",

    version: Number(data.version ?? 1),
  };
}

// =====================================================
// 11.GÜN - Yeni kategori bütçesi
//
// Kullanıcı seçilen finansal dönem için kategori veya
// kategori ağacına limit belirler.
//
// Örneğin:
//
// Ev bütçesi = 15.000 TL
//
// includeDescendants = true ise:
//
// Ev
// Ev > Kira
// Ev > Faturalar
// Ev > Faturalar > İnternet
//
// giderleri bütçeye dahil edilebilir.
// =====================================================

export async function createBudget(
  userId,
  {
    categoryId,
    categoryName,
    categoryPath,
    includeDescendants,
    budgetAmountMinor,
    periodStart,
    periodEnd,
    reportingMode,
    rolloverEnabled = false,
    rolloverSourceBudgetId = "",
    rolloverAmountMinor = 0,
  },
) {
  if (!userId) {
    throw new Error("BUDGET_USER_REQUIRED");
  }

  if (!categoryId) {
    throw new Error("BUDGET_CATEGORY_REQUIRED");
  }

  const validBudgetAmountMinor = validateBudgetAmountMinor(budgetAmountMinor);

  if (!periodStart || !periodEnd) {
    throw new Error("BUDGET_PERIOD_REQUIRED");
  }

  const budgetDocument = await addDoc(getBudgetsCollection(userId), {
    ownerId: userId,

    categoryId,

    categoryName: categoryName ?? "",

    categoryPath: categoryPath ?? "",

    includeDescendants: Boolean(includeDescendants),

    budgetAmountMinor: validBudgetAmountMinor,

    periodStart,

    periodEnd,

    reportingMode: reportingMode ?? "calendarMonth",

    rolloverEnabled: Boolean(rolloverEnabled),

    // =====================================================
    // 11.GÜN
    // Rollover kullanılıyorsa önceki bütçenin kimliği
    // ve aktarılan tutar ayrıca saklanır.
    //
    // Böylece rollover kaynağı sonradan görülebilir.
    // =====================================================

    rolloverSourceBudgetId: rolloverSourceBudgetId ?? "",

    rolloverAmountMinor: Number(rolloverAmountMinor ?? 0),

    isActive: true,

    createdAtUtc: serverTimestamp(),

    updatedAtUtc: serverTimestamp(),

    createdBy: userId,

    updatedBy: userId,

    version: 1,
  });

  const createdSnapshot = await getDoc(budgetDocument);

  return mapBudgetDocument(createdSnapshot);
}

// =====================================================
// 11.GÜN
// Kullanıcının bütün bütçe kayıtlarını getirir.
//
// Geçmiş dönem bütçeleri de tutulduğu için yalnızca
// aktif dönem değil tüm kayıtlar alınır.
// =====================================================

export async function getBudgets(userId) {
  if (!userId) {
    throw new Error("BUDGET_USER_REQUIRED");
  }

  const budgetsQuery = query(
    getBudgetsCollection(userId),
    orderBy("createdAtUtc", "desc"),
  );

  const budgetSnapshot = await getDocs(budgetsQuery);

  return budgetSnapshot.docs.map(mapBudgetDocument);
}

// =====================================================
// 11.GÜN
// Mevcut kategori bütçesinin limitini günceller.
//
// Geçmiş dönem bütçelerini değiştirmek yerine sadece
// seçilen bütçe kaydı güncellenir.
// =====================================================

export async function updateBudgetAmount(
  userId,
  { budgetId, budgetAmountMinor },
) {
  if (!userId || !budgetId) {
    throw new Error("BUDGET_REQUIRED");
  }

  const validBudgetAmountMinor = validateBudgetAmountMinor(budgetAmountMinor);

  const budgetReference = getBudgetReference(userId, budgetId);

  const currentSnapshot = await getDoc(budgetReference);

  if (!currentSnapshot.exists()) {
    throw new Error("BUDGET_NOT_FOUND");
  }

  const currentData = currentSnapshot.data();

  await updateDoc(budgetReference, {
    budgetAmountMinor: validBudgetAmountMinor,

    updatedAtUtc: serverTimestamp(),

    updatedBy: userId,

    version: Number(currentData.version ?? 1) + 1,
  });

  const updatedSnapshot = await getDoc(budgetReference);

  return mapBudgetDocument(updatedSnapshot);
}

// =====================================================
// 11.GÜN
// Bütçenin alt kategorileri kapsayıp kapsamadığını
// değiştirmek için kullanılır.
//
// true:
// Parent kategori + descendant kategoriler.
//
// false:
// Yalnız doğrudan seçilen kategori.
// =====================================================

export async function updateBudgetDescendantSetting(
  userId,
  { budgetId, includeDescendants },
) {
  if (!userId || !budgetId) {
    throw new Error("BUDGET_REQUIRED");
  }

  const budgetReference = getBudgetReference(userId, budgetId);

  await updateDoc(budgetReference, {
    includeDescendants: Boolean(includeDescendants),

    updatedAtUtc: serverTimestamp(),

    updatedBy: userId,
  });

  const updatedSnapshot = await getDoc(budgetReference);

  return mapBudgetDocument(updatedSnapshot);
}

// =====================================================
// 11.GÜN
// Bütçe aktif/pasif durumu değiştirilir.
//
// Eski dönem bütçesini tamamen silmek yerine pasif
// tutmak geçmiş raporların korunmasını kolaylaştırır.
// =====================================================

export async function updateBudgetActiveStatus(userId, budgetId, isActive) {
  if (!userId || !budgetId) {
    throw new Error("BUDGET_REQUIRED");
  }

  const budgetReference = getBudgetReference(userId, budgetId);

  await updateDoc(budgetReference, {
    isActive: Boolean(isActive),

    updatedAtUtc: serverTimestamp(),

    updatedBy: userId,
  });

  const updatedSnapshot = await getDoc(budgetReference);

  return mapBudgetDocument(updatedSnapshot);
}

// =====================================================
// 11.GÜN - Yeni tasarruf hedefi
//
// Kullanıcı iki farklı şekilde hedef oluşturabilir:
//
// 1. Sabit tutar
//
//    Örnek:
//    Bu dönem 5.000 TL tasarruf edeceğim.
//
// 2. Gelir yüzdesi
//
//    Örnek:
//    Gelirimin %20'sini tasarruf edeceğim.
// =====================================================

export async function createSavingsTarget(
  userId,
  {
    name,
    targetType,
    targetAmountMinor,
    targetPercent,
    periodStart,
    periodEnd,
    reportingMode,
  },
) {
  if (!userId) {
    throw new Error("BUDGET_USER_REQUIRED");
  }

  const validTargetType = validateSavingsTargetType(targetType);

  if (!periodStart || !periodEnd) {
    throw new Error("SAVINGS_TARGET_PERIOD_REQUIRED");
  }

  let validTargetAmountMinor = 0;

  let validTargetPercent = null;

  // =====================================================
  // 11.GÜN
  // Sabit tutar hedefi seçildiyse tutar doğrulanır.
  // =====================================================

  if (validTargetType === "amount") {
    validTargetAmountMinor = validateBudgetAmountMinor(targetAmountMinor);
  }

  // =====================================================
  // 11.GÜN
  // Gelir yüzdesi hedefi seçildiyse yüzde doğrulanır.
  //
  // 0'dan büyük ve en fazla %100 olabilir.
  // =====================================================

  if (validTargetType === "incomePercent") {
    validTargetPercent = validateSavingsTargetPercent(targetPercent);
  }

  const targetDocument = await addDoc(getSavingsTargetsCollection(userId), {
    ownerId: userId,

    name: name?.trim() || "Tasarruf Hedefi",

    targetType: validTargetType,

    targetAmountMinor: validTargetAmountMinor,

    targetPercent: validTargetPercent,

    periodStart,

    periodEnd,

    reportingMode: reportingMode ?? "calendarMonth",

    isActive: true,

    createdAtUtc: serverTimestamp(),

    updatedAtUtc: serverTimestamp(),

    createdBy: userId,

    updatedBy: userId,

    version: 1,
  });

  const createdSnapshot = await getDoc(targetDocument);

  return mapSavingsTargetDocument(createdSnapshot);
}

// =====================================================
// 11.GÜN
// Kullanıcının bütün tasarruf hedeflerini getirir.
//
// Geçmiş dönem hedefleri de saklanır.
// =====================================================

export async function getSavingsTargets(userId) {
  if (!userId) {
    throw new Error("BUDGET_USER_REQUIRED");
  }

  const targetsQuery = query(
    getSavingsTargetsCollection(userId),

    orderBy("createdAtUtc", "desc"),
  );

  const targetsSnapshot = await getDocs(targetsQuery);

  return targetsSnapshot.docs.map(mapSavingsTargetDocument);
}

// =====================================================
// 11.GÜN
// Tasarruf hedefi aktif veya pasif yapılabilir.
//
// Eski hedef doğrudan silinmez.
// Böylece geçmiş finansal dönem bilgisi korunabilir.
// =====================================================

export async function updateSavingsTargetActiveStatus(
  userId,
  savingsTargetId,
  isActive,
) {
  if (!userId || !savingsTargetId) {
    throw new Error("SAVINGS_TARGET_REQUIRED");
  }

  const targetReference = getSavingsTargetReference(userId, savingsTargetId);

  const currentSnapshot = await getDoc(targetReference);

  if (!currentSnapshot.exists()) {
    throw new Error("SAVINGS_TARGET_NOT_FOUND");
  }

  const currentData = currentSnapshot.data();

  await updateDoc(targetReference, {
    isActive: Boolean(isActive),

    updatedAtUtc: serverTimestamp(),

    updatedBy: userId,

    version: Number(currentData.version ?? 1) + 1,
  });

  const updatedSnapshot = await getDoc(targetReference);

  return mapSavingsTargetDocument(updatedSnapshot);
}
