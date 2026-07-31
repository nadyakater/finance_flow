import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createTransaction,
  getTransactions,
} from "../infrastructure/firebaseTransactionRepository";

// 3.GÜN - Gelir ve gider kayıtlarını getiren Redux thunk oluşturuldu.
export const loadTransactions =
  createAsyncThunk(
    "transactions/loadTransactions",
    async (
      userId,
      { rejectWithValue },
    ) => {
      try {
        return await getTransactions(userId);
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

// 3.GÜN - Yeni gelir veya gider kaydını ekleyen Redux thunk oluşturuldu.
export const addTransaction =
  createAsyncThunk(
    "transactions/addTransaction",
    async (
      {
        userId,
        transactionType,
        incomeType,
      },
      { rejectWithValue },
    ) => {
      try {
        return await createTransaction(
          userId,
          {
            transactionType,
            incomeType,
          },
        );
      } catch (error) {
        console.error(
          "Transaction create error:",
          error,
        );

        return rejectWithValue(
          "Kayıt eklenirken bir hata oluştu.",
        );
      }
    },
  );