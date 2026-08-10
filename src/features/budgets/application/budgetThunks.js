import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createBudget,
  createSavingsTarget,
  getBudgets,
  getSavingsTargets,
  updateBudgetActiveStatus,
  updateBudgetAmount,
  updateBudgetDescendantSetting,
  updateSavingsTargetActiveStatus,
} from "../infrastructure/firebaseBudgetRepository";

// =====================================================
// 11.GÜN - Bütçe ve hedef hata mesajları
//
// Repository katmanından gelen teknik hata kodlarını
// kullanıcıya daha anlaşılır Türkçe mesajlara çevirir.
// =====================================================

function getBudgetErrorMessage(error) {
  const errorCode = error?.message ?? "";

  if (errorCode === "BUDGET_USER_REQUIRED") {
    return "Bütçe işlemi için kullanıcı oturumu bulunamadı.";
  }

  if (errorCode === "BUDGET_CATEGORY_REQUIRED") {
    return "Bütçe oluşturmak için kategori seçmelisiniz.";
  }

  if (errorCode === "BUDGET_AMOUNT_INVALID") {
    return "Bütçe tutarı sıfırdan büyük olmalıdır.";
  }

  if (errorCode === "BUDGET_PERIOD_REQUIRED") {
    return "Bütçe için geçerli bir finansal dönem bulunamadı.";
  }

  if (errorCode === "BUDGET_REQUIRED") {
    return "Bütçe kaydı bulunamadı.";
  }

  if (errorCode === "BUDGET_NOT_FOUND") {
    return "Bütçe kaydı Firestore'da bulunamadı.";
  }

  if (errorCode === "SAVINGS_TARGET_TYPE_INVALID") {
    return "Geçersiz tasarruf hedefi türü seçildi.";
  }

  if (errorCode === "SAVINGS_TARGET_PERCENT_INVALID") {
    return "Tasarruf hedefi yüzdesi 0 ile 100 arasında olmalıdır.";
  }

  if (errorCode === "SAVINGS_TARGET_PERIOD_REQUIRED") {
    return "Tasarruf hedefi için geçerli bir finansal dönem bulunamadı.";
  }

  if (errorCode === "SAVINGS_TARGET_REQUIRED") {
    return "Tasarruf hedefi bulunamadı.";
  }

  if (errorCode === "SAVINGS_TARGET_NOT_FOUND") {
    return "Tasarruf hedefi Firestore'da bulunamadı.";
  }

  return "Bütçe veya hedef işlemi sırasında bir hata oluştu.";
}

// =====================================================
// 11.GÜN
// Kullanıcının bütün kategori bütçelerini Firestore'dan
// yükler.
//
// Geçmiş dönem bütçeleri de gelir.
// =====================================================

export const loadBudgets = createAsyncThunk(
  "budgets/loadBudgets",

  async (userId, { rejectWithValue }) => {
    try {
      return await getBudgets(userId);
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Yeni kategori veya kategori ağacı bütçesi oluşturur.
//
// Örneğin:
//
// Ev
// 15.000 TL
// Alt kategoriler dahil
//
// gibi bir bütçe kaydı oluşturulabilir.
// =====================================================

export const addBudget = createAsyncThunk(
  "budgets/addBudget",

  async (
    {
      userId,
      categoryId,
      categoryName,
      categoryPath,
      includeDescendants,
      budgetAmountMinor,
      periodStart,
      periodEnd,
      reportingMode,
      rolloverEnabled,
      rolloverSourceBudgetId,
      rolloverAmountMinor,
    },
    { rejectWithValue },
  ) => {
    try {
      return await createBudget(userId, {
        categoryId,
        categoryName,
        categoryPath,
        includeDescendants,
        budgetAmountMinor,
        periodStart,
        periodEnd,
        reportingMode,
        rolloverEnabled,
        rolloverSourceBudgetId,
        rolloverAmountMinor,
      });
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Mevcut bütçenin limit tutarını günceller.
// =====================================================

export const changeBudgetAmount = createAsyncThunk(
  "budgets/changeBudgetAmount",

  async ({ userId, budgetId, budgetAmountMinor }, { rejectWithValue }) => {
    try {
      return await updateBudgetAmount(userId, {
        budgetId,
        budgetAmountMinor,
      });
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Parent kategori bütçesinin alt kategorileri kapsayıp
// kapsamayacağını değiştirir.
//
// true:
// Alt kategoriler dahil.
//
// false:
// Yalnız doğrudan seçilen kategori.
// =====================================================

export const changeBudgetDescendantSetting = createAsyncThunk(
  "budgets/changeBudgetDescendantSetting",

  async ({ userId, budgetId, includeDescendants }, { rejectWithValue }) => {
    try {
      return await updateBudgetDescendantSetting(userId, {
        budgetId,
        includeDescendants,
      });
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Bütçenin aktif veya pasif durumunu değiştirir.
//
// Bütçe silinmediği için geçmiş finansal dönem
// bilgileri korunabilir.
// =====================================================

export const changeBudgetActiveStatus = createAsyncThunk(
  "budgets/changeBudgetActiveStatus",

  async ({ userId, budgetId, isActive }, { rejectWithValue }) => {
    try {
      return await updateBudgetActiveStatus(userId, budgetId, isActive);
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Kullanıcının bütün tasarruf hedeflerini Firestore'dan
// yükler.
// =====================================================

export const loadSavingsTargets = createAsyncThunk(
  "budgets/loadSavingsTargets",

  async (userId, { rejectWithValue }) => {
    try {
      return await getSavingsTargets(userId);
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN - Tasarruf hedefi oluşturma
//
// Kullanıcı:
//
// - sabit tutar
//
// veya
//
// - gelir yüzdesi
//
// şeklinde hedef oluşturabilir.
// =====================================================

export const addSavingsTarget = createAsyncThunk(
  "budgets/addSavingsTarget",

  async (
    {
      userId,
      name,
      targetType,
      targetAmountMinor,
      targetPercent,
      periodStart,
      periodEnd,
      reportingMode,
    },
    { rejectWithValue },
  ) => {
    try {
      return await createSavingsTarget(userId, {
        name,
        targetType,
        targetAmountMinor,
        targetPercent,
        periodStart,
        periodEnd,
        reportingMode,
      });
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);

// =====================================================
// 11.GÜN
// Tasarruf hedefini aktif veya pasif yapar.
//
// Hedef doğrudan silinmediği için eski dönem
// bilgileri korunur.
// =====================================================

export const changeSavingsTargetActiveStatus = createAsyncThunk(
  "budgets/changeSavingsTargetActiveStatus",

  async ({ userId, savingsTargetId, isActive }, { rejectWithValue }) => {
    try {
      return await updateSavingsTargetActiveStatus(
        userId,
        savingsTargetId,
        isActive,
      );
    } catch (error) {
      return rejectWithValue(getBudgetErrorMessage(error));
    }
  },
);
