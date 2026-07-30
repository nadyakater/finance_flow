import { getAuthErrorMessage } from "./authThunks";

import { subscribeToAuthChanges } from "../infrastructure/firebaseAuthRepository";

import {
  authInitializationStarted,
  authStateChanged,
  authStateFailed,
} from "../presentation/authSlice";

// 1.GÜN - Firebase oturum listener işlemi Redux ile bağlandı.
export const startAuthSubscription = () => (dispatch) => {
  dispatch(authInitializationStarted());

  return subscribeToAuthChanges(
    (user) => {
      dispatch(authStateChanged(user));
    },
    (error) => {
      console.error("Oturum kontrol hatası:", error);

      dispatch(
        authStateFailed(getAuthErrorMessage(error)),
      );
    },
  );
};