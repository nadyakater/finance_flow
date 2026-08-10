import {
  createAsyncThunk,
} from "@reduxjs/toolkit";

import {
  getStatementPeriods,
  payStatementPeriod,
  updateStatementDueDate,
} from "../infrastructure/firebaseStatementRepository";

function getStatementErrorMessage(
  error,
  fallbackMessage,
) {
  const messages = {
    STATEMENT_USER_REQUIRED:
      "Ekstreleri görüntülemek için kullanıcı oturumu bulunamadı.",

    STATEMENT_NOT_FOUND:
      "Ekstre kaydı bulunamadı.",

    STATEMENT_PAYMENT_REQUIRED:
      "Ekstre ödeme bilgileri eksik.",

    STATEMENT_PAYMENT_AMOUNT_INVALID:
      "Ödeme tutarı sıfırdan büyük olmalıdır.",

    STATEMENT_PAYMENT_EXCEEDS_REMAINING:
      "Ödeme tutarı kalan ekstre borcunu aşamaz.",

    STATEMENT_DUE_DATE_REQUIRED:
      "Son ödeme tarihi zorunludur.",

    STATEMENT_MANUAL_DUE_DATE_INVALID:
      "Son ödeme tarihi ekstre kapanış tarihinden sonra olmalıdır.",
  };

  return (
    messages[error?.message] ??
    fallbackMessage
  );
}

// =====================================================
// 11.GÜN
// Kullanıcının kredi kartı ekstre dönemlerini Firestore
// üzerinden yükleyen Async Thunk oluşturuldu.
// =====================================================

export const loadStatementPeriods =
  createAsyncThunk(
    "statements/loadStatementPeriods",

    async (
      userId,
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await getStatementPeriods(
          userId,
        );
      } catch (error) {
        console.error(
          "Statement load error:",
          error,
        );

        return rejectWithValue(
          getStatementErrorMessage(
            error,
            "Ekstreler yüklenirken bir hata oluştu.",
          ),
        );
      }
    },
  );

// =====================================================
// 11.GÜN
// Kart ödemesi gider oluşturmadan ilgili ekstrenin
// paidAmountMinor değerini artıran işlem başlatılır.
// =====================================================

export const payStatement =
  createAsyncThunk(
    "statements/payStatement",

    async (
      {
        userId,
        statementPeriodId,
        amount,
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await payStatementPeriod(
          userId,
          statementPeriodId,
          amount,
        );
      } catch (error) {
        console.error(
          "Statement payment error:",
          error,
        );

        return rejectWithValue(
          getStatementErrorMessage(
            error,
            "Ekstre ödemesi kaydedilemedi.",
          ),
        );
      }
    },
  );

// =====================================================
// 11.GÜN
// Bankanın gerçek son ödeme tarihi farklıysa kullanıcının
// ekstre tarihini manuel güncellemesi sağlandı.
// =====================================================

export const changeStatementDueDate =
  createAsyncThunk(
    "statements/changeStatementDueDate",

    async (
      {
        userId,
        statementPeriodId,
        dueDate,
      },
      {
        rejectWithValue,
      },
    ) => {
      try {
        return await updateStatementDueDate(
          userId,
          statementPeriodId,
          dueDate,
        );
      } catch (error) {
        console.error(
          "Statement due date update error:",
          error,
        );

        return rejectWithValue(
          getStatementErrorMessage(
            error,
            "Son ödeme tarihi güncellenemedi.",
          ),
        );
      }
    },
  );