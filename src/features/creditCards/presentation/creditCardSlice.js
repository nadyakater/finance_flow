import {
  createSlice,
} from "@reduxjs/toolkit";

import {
  addCreditCard,
  changeCreditCardActiveStatus,
  loadCreditCards,
} from "../application/creditCardThunks";

const initialState = {
  creditCards: [],

  loadStatus: "idle",

  mutationStatus: "idle",

  error: null,
};

function sortCreditCards(
  creditCards,
) {
  creditCards.sort(
    (
      firstCreditCard,
      secondCreditCard,
    ) =>
      firstCreditCard.name.localeCompare(
        secondCreditCard.name,
        "tr",
      ),
  );
}

const creditCardSlice =
  createSlice({
    name: "creditCards",

    initialState,

    reducers: {},

    extraReducers: (
      builder,
    ) => {
      builder
        .addCase(
          loadCreditCards.pending,
          (state) => {
            state.loadStatus =
              "loading";

            state.error = null;
          },
        )
        .addCase(
          loadCreditCards.fulfilled,
          (state, action) => {
            state.creditCards =
              action.payload;

            state.loadStatus =
              "succeeded";

            state.error = null;
          },
        )
        .addCase(
          loadCreditCards.rejected,
          (state, action) => {
            state.loadStatus =
              "failed";

            state.error =
              action.payload ??
              "Kredi kartları getirilemedi.";
          },
        )
        .addCase(
          addCreditCard.pending,
          (state) => {
            state.mutationStatus =
              "loading";

            state.error = null;
          },
        )
        .addCase(
          addCreditCard.fulfilled,
          (state, action) => {
            state.creditCards.push(
              action.payload,
            );

            sortCreditCards(
              state.creditCards,
            );

            state.mutationStatus =
              "succeeded";

            state.error = null;
          },
        )
        .addCase(
          addCreditCard.rejected,
          (state, action) => {
            state.mutationStatus =
              "failed";

            state.error =
              action.payload ??
              "Kredi kartı eklenemedi.";
          },
        )
        .addCase(
          changeCreditCardActiveStatus.pending,
          (state) => {
            state.mutationStatus =
              "loading";

            state.error = null;
          },
        )
        .addCase(
          changeCreditCardActiveStatus.fulfilled,
          (state, action) => {
            const updatedCreditCard =
              action.payload;

            const creditCardIndex =
              state.creditCards.findIndex(
                (creditCard) =>
                  creditCard.id ===
                  updatedCreditCard.id,
              );

            if (
              creditCardIndex !== -1
            ) {
              state.creditCards[
                creditCardIndex
              ] =
                updatedCreditCard;
            }

            sortCreditCards(
              state.creditCards,
            );

            state.mutationStatus =
              "succeeded";

            state.error = null;
          },
        )
        .addCase(
          changeCreditCardActiveStatus.rejected,
          (state, action) => {
            state.mutationStatus =
              "failed";

            state.error =
              action.payload ??
              "Kredi kartı durumu değiştirilemedi.";
          },
        );
    },
  });

// 9.GÜN - Kredi kartı kayıtlarının Redux state yapısı oluşturuldu.
export default creditCardSlice.reducer;