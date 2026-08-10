import { createSelector } from "@reduxjs/toolkit";

import { selectCreditCardAggregateSummaries } from "../../statements/presentation/statementSelectors";

// =====================================================
// Kredi kartı state'ine ulaşmak için kullanılan
// temel selector.
// =====================================================

const selectCreditCardState = (state) => state.creditCards;

// =====================================================
// Kredi kartı harcamalarının hesaplanabilmesi için
// transaction kayıtlarını Redux içerisinden alır.
// =====================================================

const selectTransactionItems = (state) => state.transactions.items;

// 9.GÜN - Kredi kartı kayıtlarını Redux içerisinden alan selector oluşturuldu.
export const selectCreditCards = (state) =>
  selectCreditCardState(state).creditCards;

// =====================================================
// 11.GÜN
// Sadece aktif durumda olan kredi kartlarını getirir.
//
// Pasif hale getirilen bir kart yeni işlemlerde
// kullanılmayacağı için aktif kart listesinde gösterilmez.
// createSelector kullanıldığı için gereksiz hesaplamaların
// tekrar yapılması da engellenir.
// =====================================================

export const selectActiveCreditCards = createSelector(
  [selectCreditCards],
  (creditCards) => creditCards.filter((creditCard) => creditCard.isActive),
);

// 9.GÜN - Kredi kartlarının yüklenme durumunu alan selector oluşturuldu.
export const selectCreditCardLoadStatus = (state) =>
  selectCreditCardState(state).loadStatus;

// 9.GÜN - Kredi kartı ekleme ve güncelleme durumunu alan selector oluşturuldu.
export const selectCreditCardMutationStatus = (state) =>
  selectCreditCardState(state).mutationStatus;

// 9.GÜN - Kredi kartı işlemlerindeki hata bilgisini alan selector oluşturuldu.
export const selectCreditCardError = (state) =>
  selectCreditCardState(state).error;

// =====================================================
// 10.GÜN
// Her kredi kartının kullanılan ve kalan limitini hesaplar.
//
// Kartla yapılan gider işlemleri bulunur.
// İade edilmiş tutarlar harcamadan çıkarılır.
//
// Örneğin:
//
// Kart limiti = 20.000 TL
// Harcama      = 6.000 TL
// İade         = 1.000 TL
//
// Kullanılan limit = 5.000 TL
// Kalan limit      = 15.000 TL
// =====================================================

export const selectCreditCardsWithRemainingLimit = createSelector(
  [selectCreditCards, selectTransactionItems],
  (creditCards, transactions) =>
    creditCards.map((creditCard) => {
      // =====================================================
      // 10.GÜN
      // Sadece bu kredi kartıyla yapılmış gider işlemleri
      // hesaplamaya dahil edilir.
      // =====================================================

      const usedLimitMinor = transactions
        .filter(
          (transaction) =>
            transaction.transactionType === "Gider" &&
            transaction.paymentMethod === "Kredi Kartı" &&
            transaction.creditCardId === creditCard.id,
        )
        .reduce((total, transaction) => {
          const amountMinor = Number(transaction.amountMinor ?? 0);

          const refundedMinor = Number(transaction.refundedMinor ?? 0);

          // =====================================================
          // 10.GÜN
          // İşleme ait bir iade varsa kullanılan limitten
          // bu iade miktarı çıkarılır.
          //
          // Math.max kullanılarak değer hiçbir zaman
          // negatif hale getirilmez.
          // =====================================================

          return total + Math.max(amountMinor - refundedMinor, 0);
        }, 0);

      const limitMinor = Number(creditCard.limitMinor ?? 0);

      return {
        ...creditCard,

        usedLimitMinor,

        remainingLimitMinor: Math.max(limitMinor - usedLimitMinor, 0),
      };
    }),
);

// =====================================================
// 11.GÜN - KREDİ KARTI LİMİT VE RİSK ANALİZİ
//
// Çoklu kredi kartı analizinde her kart için:
//
// - toplam kart limiti,
// - kullanılan limit,
// - kullanılabilir limit,
// - limit kullanım yüzdesi,
// - yaklaşan ekstre yükü
//
// tek bir yapı içerisinde hazırlanır.
//
// Bu selector daha sonra oluşturacağımız toplu kredi kartı
// analiz ekranının temel verisini sağlayacak.
// =====================================================

export const selectCreditCardRiskSummaries = createSelector(
  [selectCreditCardsWithRemainingLimit, selectCreditCardAggregateSummaries],
  (creditCards, aggregateSummaries) =>
    creditCards.map((creditCard) => {
      // =====================================================
      // 11.GÜN
      // Bir önceki dosyada hesapladığımız kart bazlı
      // ekstre ve harcama bilgileri alınır.
      //
      // Bu kart için henüz finansal hareket yoksa
      // hesaplamaların bozulmaması için değerler
      // sıfır olarak kabul edilir.
      // =====================================================

      const aggregateSummary = aggregateSummaries[creditCard.id] ?? {
        currentCycleSpendingMinor: 0,

        projectedStatementMinor: 0,

        closedUnpaidStatementMinor: 0,

        futureInstallmentsMinor: 0,

        newSpendingMinor: 0,

        priorCommitmentBurdenMinor: 0,
      };

      // =====================================================
      // 11.GÜN
      // Kart limitinin gerçekten tanımlı olup olmadığı
      // ayrıca kontrol edilir.
      //
      // Limit sıfır, boş veya geçersizse kullanıcıya
      // yanlış bir yüzde göstermek yerine yüzde
      // hesaplanmaz.
      // =====================================================

      const limitMinor = Number(creditCard.limitMinor);

      const hasKnownLimit = Number.isFinite(limitMinor) && limitMinor > 0;

      // =====================================================
      // 11.GÜN
      // Kullanılan limit mevcut harcamalardan alınır.
      // =====================================================

      const usedLimitMinor = Number(creditCard.usedLimitMinor ?? 0);

      // =====================================================
      // 11.GÜN
      // Kullanılabilir limit:
      //
      // Kart limiti - kullanılan limit
      //
      // şeklinde hesaplanır.
      //
      // Kart limiti bilinmiyorsa kullanılabilir limit
      // de kesin olarak hesaplanamayacağı için null tutulur.
      // =====================================================

      const availableLimitMinor = hasKnownLimit
        ? Math.max(limitMinor - usedLimitMinor, 0)
        : null;

      // =====================================================
      // 11.GÜN
      // Kart limitinin yüzde kaçının kullanıldığı hesaplanır.
      //
      // Örneğin:
      //
      // Limit          = 20.000 TL
      // Kullanılan     = 5.000 TL
      //
      // Limit kullanımı = %25
      //
      // Limit bilinmiyorsa yüzde hesaplanmaz.
      // =====================================================

      const limitUsagePercent = hasKnownLimit
        ? Math.min((usedLimitMinor / limitMinor) * 100, 100)
        : null;

      // =====================================================
      // 11.GÜN
      // Yaklaşan yük olarak mevcut dönemin oluşması
      // beklenen ekstre tutarı kullanılır.
      //
      // Bu tutarın içerisinde:
      //
      // - mevcut dönemde yapılan yeni harcamalar
      // - önceki dönemlerden bu aya gelen taksitler
      //
      // birlikte bulunur.
      // =====================================================

      const upcomingBurdenMinor = Number(
        aggregateSummary.projectedStatementMinor ?? 0,
      );

      // =====================================================
      // 11.GÜN
      // Yaklaşan ekstre ödendikten sonra ne kadar limit
      // kalacağını gösteren yardımcı değer hesaplanır.
      //
      // Bu değer yalnızca limit bilgisi mevcutsa
      // hesaplanabilir.
      // =====================================================

      const availableLimitAfterUpcomingBurdenMinor = hasKnownLimit
        ? Math.max(availableLimitMinor - upcomingBurdenMinor, 0)
        : null;

      return {
        ...creditCard,

        // =====================================================
        // 11.GÜN
        // Kartın mevcut limit bilgileri.
        // =====================================================

        limitMinor: hasKnownLimit ? limitMinor : null,

        usedLimitMinor,

        availableLimitMinor,

        limitUsagePercent,

        // =====================================================
        // 11.GÜN
        // Kartın mevcut dönemde yaptığı yeni harcamalar.
        // =====================================================

        currentCycleSpendingMinor: Number(
          aggregateSummary.currentCycleSpendingMinor ?? 0,
        ),

        // =====================================================
        // 11.GÜN
        // Mevcut dönemde oluşması beklenen toplam
        // ekstre yükü.
        // =====================================================

        projectedStatementMinor: Number(
          aggregateSummary.projectedStatementMinor ?? 0,
        ),

        // =====================================================
        // 11.GÜN
        // Önceki dönemlerden kalan ve henüz tamamen
        // ödenmemiş kapalı ekstrelerin toplamı.
        // =====================================================

        closedUnpaidStatementMinor: Number(
          aggregateSummary.closedUnpaidStatementMinor ?? 0,
        ),

        // =====================================================
        // 11.GÜN
        // Bu ekstre döneminden sonraki aylara kalan
        // taksitlerin toplamı.
        // =====================================================

        futureInstallmentsMinor: Number(
          aggregateSummary.futureInstallmentsMinor ?? 0,
        ),

        // =====================================================
        // 11.GÜN
        // Mevcut dönemde yapılan yeni harcamalar
        // ayrıca tutulur.
        // =====================================================

        newSpendingMinor: Number(aggregateSummary.newSpendingMinor ?? 0),

        // =====================================================
        // 11.GÜN
        // Önceki aylardaki alışverişlerden mevcut
        // döneme gelen taksit yükü ayrıca tutulur.
        // =====================================================

        priorCommitmentBurdenMinor: Number(
          aggregateSummary.priorCommitmentBurdenMinor ?? 0,
        ),

        upcomingBurdenMinor,

        availableLimitAfterUpcomingBurdenMinor,
      };
    }),
);

// =====================================================
// 11.GÜN - BÜTÜN KARTLARIN LİMİT ÖZETİ
//
// Tek tek hesaplanan kredi kartı verileri toplanarak
// bütün kartların ortak limit bilgisi hazırlanır.
//
// Bu değerleri daha sonra analiz tablosunun
// "Toplam" satırında kullanacağız.
// =====================================================

export const selectCreditCardRiskTotals = createSelector(
  [selectCreditCardRiskSummaries],
  (creditCardRiskSummaries) => {
    const initialTotals = {
      totalLimitMinor: 0,

      totalUsedLimitMinor: 0,

      totalAvailableLimitMinor: 0,

      totalUpcomingBurdenMinor: 0,

      totalProjectedStatementMinor: 0,

      totalClosedUnpaidStatementMinor: 0,

      totalFutureInstallmentsMinor: 0,

      totalNewSpendingMinor: 0,

      totalPriorCommitmentBurdenMinor: 0,

      knownLimitCardCount: 0,

      totalCardCount: creditCardRiskSummaries.length,
    };

    const totals = creditCardRiskSummaries.reduce(
      (currentTotals, creditCard) => {
        // =====================================================
        // 11.GÜN
        // Limit bilgisi bulunan kartların limitleri
        // toplam karta dahil edilir.
        // =====================================================

        if (creditCard.limitMinor !== null) {
          currentTotals.totalLimitMinor += Number(creditCard.limitMinor ?? 0);

          currentTotals.totalAvailableLimitMinor += Number(
            creditCard.availableLimitMinor ?? 0,
          );

          currentTotals.knownLimitCardCount += 1;
        }

        // =====================================================
        // 11.GÜN
        // Bütün kartların kullanılan limitleri toplanır.
        // =====================================================

        currentTotals.totalUsedLimitMinor += Number(
          creditCard.usedLimitMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Bütün kartların yaklaşan ekstre yükleri toplanır.
        // =====================================================

        currentTotals.totalUpcomingBurdenMinor += Number(
          creditCard.upcomingBurdenMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Kartların tahmini ekstre tutarları toplanır.
        // =====================================================

        currentTotals.totalProjectedStatementMinor += Number(
          creditCard.projectedStatementMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Kapanmış fakat henüz ödenmemiş ekstrelerin
        // toplam borcu hesaplanır.
        // =====================================================

        currentTotals.totalClosedUnpaidStatementMinor += Number(
          creditCard.closedUnpaidStatementMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Gelecek aylara kalan bütün taksitler toplanır.
        // =====================================================

        currentTotals.totalFutureInstallmentsMinor += Number(
          creditCard.futureInstallmentsMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Mevcut dönemde yapılan yeni harcamalar
        // bütün kartlar için toplanır.
        // =====================================================

        currentTotals.totalNewSpendingMinor += Number(
          creditCard.newSpendingMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Önceki dönemlerden gelen taksit yükleri
        // bütün kartlar için toplanır.
        // =====================================================

        currentTotals.totalPriorCommitmentBurdenMinor += Number(
          creditCard.priorCommitmentBurdenMinor ?? 0,
        );

        return currentTotals;
      },
      initialTotals,
    );

    // =====================================================
    // 11.GÜN
    // Bütün kartların toplam limit kullanım yüzdesi
    // hesaplanır.
    //
    // Toplam limit bilinmiyorsa yüzde gösterilmez.
    //
    // Yüzdeleri tek tek toplayıp ortalama almak yerine
    // gerçek toplam kullanılan limit / gerçek toplam limit
    // hesabı yapılır.
    // =====================================================

    const totalLimitUsagePercent =
      totals.totalLimitMinor > 0
        ? Math.min(
            (totals.totalUsedLimitMinor / totals.totalLimitMinor) * 100,
            100,
          )
        : null;

    return {
      ...totals,

      totalLimitUsagePercent,
    };
  },
);
