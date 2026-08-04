import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createRefundTransaction,
  createTransaction,
  getTransactions,
} from "../infrastructure/firebaseTransactionRepository";

function getTransactionErrorMessage(
  error,
  fallbackMessage,
) {
  if (
    error?.message ===
    "TRANSACTION_INVALID_AMOUNT"
  ) {
    return "Miktar sıfırdan büyük olmalıdır.";
  }

  if (
    error?.message ===
    "TRANSACTION_INVALID_DISCOUNT"
  ) {
    return "İndirim tutarı geçersizdir veya gider tutarından büyüktür.";
  }

  if (
    error?.message ===
    "TRANSACTION_LINE_CATEGORY_REQUIRED"
  ) {
    return "Bütün gider satırları için kategori seçilmelidir.";
  }

  if (
    error?.message ===
    "TRANSACTION_INVALID_QUANTITY"
  ) {
    return "Ürün miktarı ve paket bilgileri sıfırdan büyük olmalıdır.";
  }

  if (
    error?.message ===
    "REFUND_ORIGINAL_REQUIRED"
  ) {
    return "İade oluşturmak için önce gider kaydı seçilmelidir.";
  }

  if (
    error?.message ===
    "REFUND_ORIGINAL_NOT_FOUND"
  ) {
    return "İade edilecek gider kaydı bulunamadı.";
  }

  if (
    error?.message ===
    "REFUND_ONLY_EXPENSE"
  ) {
    return "Yalnızca gider kayıtları için iade oluşturulabilir.";
  }

  if (
    error?.message ===
    "REFUND_AMOUNT_EXCEEDED"
  ) {
    return "İade tutarı, giderin kalan iade edilebilir tutarından büyük olamaz.";
  }

  return fallbackMessage;
}

// 3.GÜN - Gelir ve gider kayıtlarını getiren Redux thunk oluşturuldu.
export const loadTransactions =
  createAsyncThunk(
    "transactions/loadTransactions",
    async (
      userId,
      { rejectWithValue },
    ) => {
      try {
        return await getTransactions(
          userId,
        );
      } catch (error) {
        console.error(
          "Transaction load error:",
          error,
        );

        return rejectWithValue(
          "Kayıtlar getirilirken bir hata oluştu.",
        );
      }
    },
  );

// 4.GÜN - Gelir gider miktar ve kategori bilgisi ile kayıt ekleme güncellendi.
// 5.GÜN - Kategori kimliği ve kategori yolu kayıt işlemine eklendi.
// 5.2.GÜN - Çok satırlı gider, indirim, kupon, ödeme yöntemi ve tarih bilgileri thunk işlemine eklendi.
// 6.GÜN - Firma, şube, ürün, marka ve miktar bilgileri kayıt işlemine eklendi.
export const addTransaction =
  createAsyncThunk(
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
        return await createTransaction(
          userId,
          {
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
            paymentMethod,
            transactionDate,
            merchantId,
            merchantName,
            branchId,
            branchName,
          },
        );
      } catch (error) {
        console.error(
          "Transaction create error:",
          error,
        );

        return rejectWithValue(
          getTransactionErrorMessage(
            error,
            "Kayıt eklenirken bir hata oluştu.",
          ),
        );
      }
    },
  );

// 6.GÜN - Tam veya kısmi iade kaydını oluşturan Redux thunk eklendi.
export const addRefundTransaction =
  createAsyncThunk(
    "transactions/addRefundTransaction",
    async (
      {
        userId,
        originalTransactionId,
        amount,
        reason,
        paymentMethod,
        transactionDate,
      },
      { rejectWithValue },
    ) => {
      try {
        return await createRefundTransaction(
          userId,
          {
            originalTransactionId,
            amount,
            reason,
            paymentMethod,
            transactionDate,
          },
        );
      } catch (error) {
        console.error(
          "Refund create error:",
          error,
        );

        return rejectWithValue(
          getTransactionErrorMessage(
            error,
            "İade kaydı oluşturulurken bir hata oluştu.",
          ),
        );
      }
    },
  );