import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createCreditCard,
  getCreditCards,
  updateCreditCardActiveStatus,
} from "../infrastructure/firebaseCreditCardRepository";

function getCreditCardErrorMessage(
  error,
  fallbackMessage,
) {
  if (
    error?.message ===
    "CREDIT_CARD_USER_REQUIRED"
  ) {
    return "Kullanıcı oturumu bulunamadı.";
  }

  if (
    error?.message ===
    "CREDIT_CARD_NAME_REQUIRED"
  ) {
    return "Kart adı zorunludur.";
  }

  if (
    error?.message ===
    "CREDIT_CARD_ISSUER_REQUIRED"
  ) {
    return "Banka veya kurum adı zorunludur.";
  }

  if (
    error?.message ===
    "CREDIT_CARD_LAST_FOUR_DIGITS_INVALID"
  ) {
    return "Kartın son dört hanesi yalnızca 4 rakamdan oluşmalıdır.";
  }

  if (
    error?.message ===
    "CREDIT_CARD_LIMIT_INVALID"
  ) {
    return "Kart limiti sıfırdan büyük olmalıdır.";
  }

  if (
    error?.message ===
    "CREDIT_CARD_STATEMENT_DAY_INVALID"
  ) {
    return "Hesap kesim günü 1 ile 31 arasında olmalıdır.";
  }

  if (
    error?.message ===
    "CREDIT_CARD_NOT_FOUND"
  ) {
    return "Kredi kartı kaydı bulunamadı.";
  }

  return fallbackMessage;
}

// 9.GÜN - Kullanıcının kredi kartı kayıtlarını getiren Redux thunk oluşturuldu.
export const loadCreditCards =
  createAsyncThunk(
    "creditCards/loadCreditCards",

    async (
      userId,
      { rejectWithValue },
    ) => {
      try {
        return await getCreditCards(
          userId,
        );
      } catch (error) {
        console.error(
          "Credit card load error:",
          error,
        );

        return rejectWithValue(
          getCreditCardErrorMessage(
            error,
            "Kredi kartları getirilirken bir hata oluştu.",
          ),
        );
      }
    },
  );

// 9.GÜN - Yeni kredi kartı kaydını oluşturan Redux thunk eklendi.
export const addCreditCard =
  createAsyncThunk(
    "creditCards/addCreditCard",

    async (
      {
        userId,

        name,

        issuer,

        lastFourDigits,

        limit,

        statementDay,

        linkedPaymentAccountId,
      },
      { rejectWithValue },
    ) => {
      try {
        return await createCreditCard(
          userId,
          {
            name,

            issuer,

            lastFourDigits,

            limit,

            statementDay,

            linkedPaymentAccountId,
          },
        );
      } catch (error) {
        console.error(
          "Credit card create error:",
          error,
        );

        return rejectWithValue(
          getCreditCardErrorMessage(
            error,
            "Kredi kartı eklenirken bir hata oluştu.",
          ),
        );
      }
    },
  );

// 9.GÜN - Kredi kartının aktif veya kapalı durumunu değiştiren Redux thunk eklendi.
export const changeCreditCardActiveStatus =
  createAsyncThunk(
    "creditCards/changeCreditCardActiveStatus",

    async (
      {
        userId,
        creditCardId,
        isActive,
      },
      { rejectWithValue },
    ) => {
      try {
        return await updateCreditCardActiveStatus(
          userId,
          creditCardId,
          isActive,
        );
      } catch (error) {
        console.error(
          "Credit card status update error:",
          error,
        );

        return rejectWithValue(
          getCreditCardErrorMessage(
            error,
            "Kredi kartı durumu değiştirilirken bir hata oluştu.",
          ),
        );
      }
    },
  );