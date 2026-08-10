import {
  createAsyncThunk,
} from "@reduxjs/toolkit";

import {
  getInstallmentPlans,
} from "../infrastructure/firebaseInstallmentRepository";

function getInstallmentErrorMessage(
  error,
  fallbackMessage,
) {
  if (
    error?.message ===
    "INSTALLMENT_USER_REQUIRED"
  ) {
    return "Kullanıcı oturumu bulunamadı.";
  }

  return fallbackMessage;
}

// =====================================================
// 11.GÜN
// Kullanıcının taksit planlarının Firestore üzerinden
// yüklenmesini başlatan Redux thunk oluşturuldu.
//
// Firebase işlemi thunk içerisinde yapılmaz, repository
// katmanındaki fonksiyon çağrılarak veri alınır.
// =====================================================
export const loadInstallmentPlans =
  createAsyncThunk(
    "installments/loadInstallmentPlans",

    async (
      userId,
      { rejectWithValue },
    ) => {
      try {
        return await getInstallmentPlans(
          userId,
        );
      } catch (error) {
        console.error(
          "Installment plan load error:",
          error,
        );

        return rejectWithValue(
          getInstallmentErrorMessage(
            error,
            "Taksit planları getirilirken bir hata oluştu.",
          ),
        );
      }
    },
  );