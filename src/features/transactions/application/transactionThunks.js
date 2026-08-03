import { createAsyncThunk } from "@reduxjs/toolkit";

import {
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