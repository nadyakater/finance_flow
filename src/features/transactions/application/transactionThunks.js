import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  archiveTransaction,
  createRefundTransaction,
  createTransaction,
  getTransactions,
} from "../infrastructure/firebaseTransactionRepository";

import { getTransactionErrorMessage } from "./transactionErrorMapper";

// =====================================================
// 3.GÜN
// Kullanıcının aktif gelir, gider ve iade kayıtlarını
// Firestore üzerinden getirir.
// =====================================================

export const loadTransactions = createAsyncThunk(
  "transactions/loadTransactions",

  async (userId, { rejectWithValue }) => {
    try {
      return await getTransactions(userId);
    } catch (error) {
      console.error("Transaction load error:", error);

      return rejectWithValue(
        getTransactionErrorMessage(
          error,
          "Kayıtlar getirilirken bir hata oluştu.",
        ),
      );
    }
  },
);

// =====================================================
// 7.GÜN
// Gelir veya gider kaydını oluşturur.
//
// Fiş veya fatura yükleme özelliği kaldırıldığı için
// dosya yükleme işlemi artık bu thunk içinde yapılmaz.
// =====================================================

export const addTransaction = createAsyncThunk(
  "transactions/addTransaction",

  async (
    {
      userId,

      transactionType,

      categoryId,

      category,

      categoryPath,

      categoryPathIds,

      categoryType,

      amount,

      lines,

      transactionDiscount,

      couponCode,

      description,

      paymentMethod,

      transactionDate,

      merchantId,

      merchantName,

      branchId,

      branchName,
    },
    { rejectWithValue },
  ) => {
    try {
      return await createTransaction(userId, {
        transactionType,

        categoryId,

        category,

        categoryPath,

        categoryPathIds,

        categoryType,

        amount,

        lines,

        transactionDiscount,

        couponCode,

        description,

        paymentMethod,

        transactionDate,

        merchantId,

        merchantName,

        branchId,

        branchName,
      });
    } catch (error) {
      console.error("Transaction create error:", error);

      return rejectWithValue(
        getTransactionErrorMessage(error, "Kayıt eklenirken bir hata oluştu."),
      );
    }
  },
);

// =====================================================
// 7.GÜN
// Tam, kısmi veya ürün satırı bazlı iade oluşturur.
// =====================================================

export const addRefundTransaction = createAsyncThunk(
  "transactions/addRefundTransaction",

  async (
    {
      userId,

      originalTransactionId,

      amount,

      refundedLines,

      reason,

      paymentMethod,

      transactionDate,
    },
    { rejectWithValue },
  ) => {
    try {
      return await createRefundTransaction(userId, {
        originalTransactionId,

        amount,

        refundedLines,

        reason,

        paymentMethod,

        transactionDate,
      });
    } catch (error) {
      console.error("Refund create error:", error);

      return rejectWithValue(
        getTransactionErrorMessage(
          error,
          "İade kaydı oluşturulurken bir hata oluştu.",
        ),
      );
    }
  },
);

// =====================================================
// 7.GÜN
// Finansal kayıtları kalıcı olarak silmek yerine
// soft-delete yöntemiyle arşivler.
// =====================================================

export const removeTransaction = createAsyncThunk(
  "transactions/removeTransaction",

  async ({ userId, transactionId }, { rejectWithValue }) => {
    try {
      return await archiveTransaction(userId, transactionId);
    } catch (error) {
      console.error("Transaction archive error:", error);

      return rejectWithValue(
        getTransactionErrorMessage(
          error,
          "Kayıt arşivlenirken bir hata oluştu.",
        ),
      );
    }
  },
);
