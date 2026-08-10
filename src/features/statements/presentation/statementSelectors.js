import { createSelector } from "@reduxjs/toolkit";

const selectStatementState = (state) => state.statements;

const selectTransactionItems = (state) => state.transactions.items;

const selectInstallmentItems = (state) => state.installments.items;

// =====================================================
// 11.GÜN
// Bütün ekstre dönemlerini Redux içerisinden alır.
// =====================================================

export const selectStatementPeriods = (state) =>
  selectStatementState(state).items;

// =====================================================
// 11.GÜN
// Ekstrelerin yüklenme durumunu Redux içerisinden alır.
// =====================================================

export const selectStatementLoadStatus = (state) =>
  selectStatementState(state).loadStatus;

// =====================================================
// 11.GÜN
// Ekstre ödeme veya tarih değiştirme gibi işlemlerin
// durumunu Redux içerisinden alır.
// =====================================================

export const selectStatementMutationStatus = (state) =>
  selectStatementState(state).mutationStatus;

// =====================================================
// 11.GÜN
// Ekstre işlemleri sırasında oluşan hata bilgisini alır.
// =====================================================

export const selectStatementError = (state) =>
  selectStatementState(state).error;

// =====================================================
// 11.GÜN
// Ekstre dönemlerini kredi kartı kimliğine göre gruplar.
//
// Örneğin:
// kart1 -> bu karta ait ekstreler
// kart2 -> bu karta ait ekstreler
//
// Böylece her kartın ekstrelerini ayrı ayrı inceleyebiliriz.
// =====================================================

export const selectStatementPeriodsByCreditCard = createSelector(
  [selectStatementPeriods],
  (statementPeriods) =>
    statementPeriods.reduce((groupedStatements, statement) => {
      if (!statement.creditCardId) {
        return groupedStatements;
      }

      if (!groupedStatements[statement.creditCardId]) {
        groupedStatements[statement.creditCardId] = [];
      }

      groupedStatements[statement.creditCardId].push(statement);

      return groupedStatements;
    }, {}),
);

// =====================================================
// 11.GÜN
// Bütün kartlardaki ödenmemiş ekstre borçlarını toplar.
//
// Bu değer kullanıcının mevcut toplam ekstre borcunu
// görebilmek için kullanılır.
// =====================================================

export const selectTotalUnpaidStatementMinor = createSelector(
  [selectStatementPeriods],
  (statementPeriods) =>
    statementPeriods.reduce(
      (total, statement) => total + Number(statement.unpaidAmountMinor ?? 0),
      0,
    ),
);

// =====================================================
// 11.GÜN
// Bugünün tarihini YYYY-MM-DD formatında oluşturur.
//
// Ekstre dönemlerinden hangisinin şu anda aktif olduğunu
// bulabilmek için bu tarih kullanılır.
// =====================================================

function getTodayDateValue() {
  const today = new Date();

  const timezoneOffset = today.getTimezoneOffset() * 60 * 1000;

  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

// =====================================================
// 11.GÜN
// Verilen ekstreler arasından şu anda geçerli olan
// ekstre dönemini bulur.
//
// Önce bugünün tarihinin içerisinde bulunduğu dönem aranır.
// Bulunamazsa projected durumundaki ekstre kullanılır.
// O da yoksa ilk kayıt kullanılır.
// =====================================================

function findCurrentStatement(statements, todayValue) {
  if (!Array.isArray(statements) || statements.length === 0) {
    return null;
  }

  const currentStatement = statements.find(
    (statement) =>
      statement.cycleStart &&
      statement.cycleEnd &&
      todayValue >= statement.cycleStart &&
      todayValue <= statement.cycleEnd,
  );

  if (currentStatement) {
    return currentStatement;
  }

  const projectedStatement = statements.find(
    (statement) => statement.status === "projected",
  );

  return projectedStatement ?? statements[0];
}

// =====================================================
// 11.GÜN
// Her kredi kartı için mevcut dönemin finansal yükünü
// ayrı ayrı hesaplar.
//
// Burada özellikle;
// - bu dönemde yapılan yeni harcamalar,
// - önceki aylardan gelen taksitler,
// - son ödeme tarihine kadar gereken para,
// - gelecekte kalan taksitler
//
// birbirinden ayrı tutulur.
//
// Böylece "bu ay ne satın aldım?" ile
// "bu ay ne kadar ödemem gerekiyor?" karıştırılmaz.
// =====================================================

export const selectCreditCardPurchaseLoadSummaries = createSelector(
  [
    selectStatementPeriodsByCreditCard,
    selectTransactionItems,
    selectInstallmentItems,
  ],
  (statementsByCreditCard, transactions, installmentPlans) => {
    const summaries = {};

    const todayValue = getTodayDateValue();

    // =====================================================
    // 11.GÜN
    // Ekstre, işlem veya taksit kaydı bulunan bütün kartların
    // kimlikleri tek bir liste içerisinde birleştirilir.
    //
    // Böylece sadece ekstre kaydı olan kartlar değil,
    // harcaması veya taksiti bulunan kartlar da hesaba katılır.
    // =====================================================

    const creditCardIds = new Set([
      ...Object.keys(statementsByCreditCard),

      ...transactions
        .filter((transaction) => transaction.creditCardId)
        .map((transaction) => transaction.creditCardId),

      ...installmentPlans
        .filter((installmentPlan) => installmentPlan.creditCardId)
        .map((installmentPlan) => installmentPlan.creditCardId),
    ]);

    creditCardIds.forEach((creditCardId) => {
      const cardStatements = statementsByCreditCard[creditCardId] ?? [];

      const currentStatement = findCurrentStatement(cardStatements, todayValue);

      // =====================================================
      // 11.GÜN
      // Kart için henüz bir ekstre dönemi bulunmuyorsa
      // bütün hesaplamalar sıfır olarak hazırlanır.
      // =====================================================

      if (!currentStatement) {
        summaries[creditCardId] = {
          cycleStart: "",

          cycleEnd: "",

          dueDate: "",

          newSpendingMinor: 0,

          priorCommitmentBurdenMinor: 0,

          cashNeededByDueDateMinor: 0,

          futureCommittedInstallmentsMinor: 0,
        };

        return;
      }

      // =====================================================
      // 11.GÜN
      // Mevcut kart döneminde yapılan yeni harcamaları bulur.
      //
      // Burada taksitli bir alışveriş yapılmış olsa bile
      // satın alma analizi açısından alışverişin TAM tutarı
      // yeni harcama olarak değerlendirilir.
      //
      // İade edilen tutarlar harcamadan çıkarılır.
      // =====================================================

      const newSpendingMinor = transactions
        .filter(
          (transaction) =>
            transaction.transactionType === "Gider" &&
            transaction.paymentMethod === "Kredi Kartı" &&
            transaction.creditCardId === creditCardId &&
            transaction.transactionDate >= currentStatement.cycleStart &&
            transaction.transactionDate <= currentStatement.cycleEnd,
        )
        .reduce((total, transaction) => {
          const amountMinor = Number(transaction.amountMinor ?? 0);

          const refundedMinor = Number(transaction.refundedMinor ?? 0);

          return total + Math.max(amountMinor - refundedMinor, 0);
        }, 0);

      // =====================================================
      // 11.GÜN
      // Önceki dönemlerde yapılan alışverişlerden
      // mevcut ekstreye düşen taksitleri hesaplar.
      //
      // Örneğin 3 ay önce yapılan 6 taksitli alışverişin
      // bu aya düşen taksiti burada yer alır.
      // =====================================================

      const priorCommitmentBurdenMinor = installmentPlans
        .filter(
          (installmentPlan) =>
            installmentPlan.creditCardId === creditCardId &&
            installmentPlan.transactionDate < currentStatement.cycleStart,
        )
        .reduce((planTotal, installmentPlan) => {
          const installments = Array.isArray(installmentPlan.installments)
            ? installmentPlan.installments
            : [];

          const currentCycleInstallments = installments.reduce(
            (installmentTotal, installment) => {
              if (installment.status === "paid") {
                return installmentTotal;
              }

              if (installment.statementDate !== currentStatement.cycleEnd) {
                return installmentTotal;
              }

              return installmentTotal + Number(installment.amountMinor ?? 0);
            },
            0,
          );

          return planTotal + currentCycleInstallments;
        }, 0);

      // =====================================================
      // 11.GÜN
      // Ekstrenin toplam tutarından daha önce yapılan
      // ödemeleri çıkarır.
      //
      // Sonuç, son ödeme tarihine kadar kullanıcının
      // gerçekten bulundurması gereken kalan parayı gösterir.
      // =====================================================

      const cashNeededByDueDateMinor = Math.max(
        Number(currentStatement.statementAmountMinor ?? 0) -
          Number(currentStatement.paidAmountMinor ?? 0),
        0,
      );

      // =====================================================
      // 11.GÜN
      // Mevcut ekstre döneminden SONRAKİ aylara kalan
      // ödenmemiş taksitleri hesaplar.
      //
      // Bunlar mevcut ekstre borcu değildir.
      // Kullanıcının gelecekte karşılaşacağı ödeme yüküdür.
      // =====================================================

      const futureCommittedInstallmentsMinor = installmentPlans
        .filter(
          (installmentPlan) => installmentPlan.creditCardId === creditCardId,
        )
        .reduce((planTotal, installmentPlan) => {
          const installments = Array.isArray(installmentPlan.installments)
            ? installmentPlan.installments
            : [];

          const futurePlanTotal = installments.reduce(
            (installmentTotal, installment) => {
              if (installment.status === "paid") {
                return installmentTotal;
              }

              if (
                !installment.statementDate ||
                installment.statementDate <= currentStatement.cycleEnd
              ) {
                return installmentTotal;
              }

              return installmentTotal + Number(installment.amountMinor ?? 0);
            },
            0,
          );

          return planTotal + futurePlanTotal;
        }, 0);

      summaries[creditCardId] = {
        cycleStart: currentStatement.cycleStart,

        cycleEnd: currentStatement.cycleEnd,

        dueDate: currentStatement.dueDate,

        newSpendingMinor,

        priorCommitmentBurdenMinor,

        cashNeededByDueDateMinor,

        futureCommittedInstallmentsMinor,
      };
    });

    return summaries;
  },
);

// =====================================================
// 11.GÜN - ÇOKLU KREDİ KARTI ANALİZİ
//
// Yukarıdaki kart bazlı hesaplamalar kullanılarak
// bütün kredi kartlarının daha kapsamlı bir özeti hazırlanır.
//
// Bu yapı daha sonra ekranda her kartı ayrı satırda
// gösterebilmek için kullanılacaktır.
// =====================================================

export const selectCreditCardAggregateSummaries = createSelector(
  [selectStatementPeriodsByCreditCard, selectCreditCardPurchaseLoadSummaries],
  (statementsByCreditCard, purchaseLoadSummaries) => {
    const summaries = {};

    // =====================================================
    // 11.GÜN
    // Ekstre veya finansal yük bilgisi bulunan bütün kartların
    // kimlikleri tek bir kümede birleştirilir.
    // =====================================================

    const creditCardIds = new Set([
      ...Object.keys(statementsByCreditCard),

      ...Object.keys(purchaseLoadSummaries),
    ]);

    creditCardIds.forEach((creditCardId) => {
      const cardStatements = statementsByCreditCard[creditCardId] ?? [];

      const purchaseLoadSummary = purchaseLoadSummaries[creditCardId] ?? {
        newSpendingMinor: 0,

        priorCommitmentBurdenMinor: 0,

        futureCommittedInstallmentsMinor: 0,
      };

      // =====================================================
      // 11.GÜN
      // Kapanmış fakat henüz tamamen ödenmemiş ekstrelerin
      // kalan borçları toplanır.
      //
      // Bu değer kartın geçmiş dönemden gelen gerçek
      // ödenmemiş ekstre borcunu gösterir.
      // =====================================================

      const closedUnpaidStatementMinor = cardStatements
        .filter(
          (statement) =>
            statement.status === "closed" &&
            Number(statement.unpaidAmountMinor ?? 0) > 0,
        )
        .reduce(
          (total, statement) =>
            total + Number(statement.unpaidAmountMinor ?? 0),
          0,
        );

      // =====================================================
      // 11.GÜN
      // Kartın mevcut dönem içerisinde yaptığı
      // yeni harcamaların toplamı alınır.
      // =====================================================

      const currentCycleSpendingMinor = Number(
        purchaseLoadSummary.newSpendingMinor ?? 0,
      );

      // =====================================================
      // 11.GÜN
      // Mevcut dönemin tahmini ekstre yükü hesaplanır.
      //
      // Tahmini ekstre:
      // Yeni yapılan harcamalar
      // +
      // Önceki dönemlerden gelen taksitler
      // =====================================================

      const projectedStatementMinor =
        currentCycleSpendingMinor +
        Number(purchaseLoadSummary.priorCommitmentBurdenMinor ?? 0);

      // =====================================================
      // 11.GÜN
      // Mevcut ekstre sonrasındaki aylara kalan
      // taksit yükü alınır.
      // =====================================================

      const futureInstallmentsMinor = Number(
        purchaseLoadSummary.futureCommittedInstallmentsMinor ?? 0,
      );

      summaries[creditCardId] = {
        creditCardId,

        currentCycleSpendingMinor,

        projectedStatementMinor,

        closedUnpaidStatementMinor,

        futureInstallmentsMinor,

        // =====================================================
        // 11.GÜN
        // Toplam ekstre yükünün hangi kısmının yeni harcamadan,
        // hangi kısmının eski taksitlerden geldiğini göstermek
        // için bu değerler ayrıca saklanır.
        // =====================================================

        newSpendingMinor: currentCycleSpendingMinor,

        priorCommitmentBurdenMinor: Number(
          purchaseLoadSummary.priorCommitmentBurdenMinor ?? 0,
        ),
      };
    });

    return summaries;
  },
);

// =====================================================
// 11.GÜN
// Bütün kredi kartlarının değerlerini tek bir toplamda
// birleştirir.
//
// Böylece ekranda kartların ayrı satırlarının altında
// "TOPLAM" satırı gösterebileceğiz.
// =====================================================

export const selectCreditCardAggregateTotals = createSelector(
  [selectCreditCardAggregateSummaries],
  (aggregateSummaries) =>
    Object.values(aggregateSummaries).reduce(
      (totals, cardSummary) => {
        // 11.GÜN - Bütün kartların mevcut dönem
        // yeni harcamaları toplanır.
        totals.currentCycleSpendingMinor += Number(
          cardSummary.currentCycleSpendingMinor ?? 0,
        );

        // 11.GÜN - Bütün kartların tahmini
        // ekstre yükleri toplanır.
        totals.projectedStatementMinor += Number(
          cardSummary.projectedStatementMinor ?? 0,
        );

        // 11.GÜN - Kapanmış fakat ödenmemiş
        // ekstre borçları toplanır.
        totals.closedUnpaidStatementMinor += Number(
          cardSummary.closedUnpaidStatementMinor ?? 0,
        );

        // 11.GÜN - Gelecek aylara kalan
        // taksitlerin tamamı toplanır.
        totals.futureInstallmentsMinor += Number(
          cardSummary.futureInstallmentsMinor ?? 0,
        );

        // 11.GÜN - Yeni harcamaların toplamı
        // ayrıca tutulur.
        totals.newSpendingMinor += Number(cardSummary.newSpendingMinor ?? 0);

        // 11.GÜN - Önceki dönemlerden gelen
        // taksitlerin toplamı ayrıca tutulur.
        totals.priorCommitmentBurdenMinor += Number(
          cardSummary.priorCommitmentBurdenMinor ?? 0,
        );

        return totals;
      },
      {
        currentCycleSpendingMinor: 0,

        projectedStatementMinor: 0,

        closedUnpaidStatementMinor: 0,

        futureInstallmentsMinor: 0,

        newSpendingMinor: 0,

        priorCommitmentBurdenMinor: 0,
      },
    ),
);

// =====================================================
// 11.GÜN
// Kullanıcının seçtiği tarihe kadar ödemesi gereken
// bütün ödenmemiş ekstreleri hesaplar.
//
// Örneğin:
// Kart A'nın son ödeme tarihi = 5 Ağustos
// Kart B'nin son ödeme tarihi = 12 Ağustos
//
// Kullanıcı 10 Ağustos'u seçerse sadece Kart A
// hesaplamaya dahil edilir.
// =====================================================

export const selectRequiredMoneyUntilDate = createSelector(
  [selectStatementPeriods, (state, selectedDate) => selectedDate],
  (statementPeriods, selectedDate) => {
    // =====================================================
    // 11.GÜN
    // Tarih seçilmemişse hesaplama yapılmaz.
    // =====================================================

    if (!selectedDate) {
      return {
        totalMinor: 0,

        statements: [],
      };
    }

    // =====================================================
    // 11.GÜN
    // Son ödeme tarihi seçilen tarihten önce veya aynı gün
    // olan ve hâlâ borcu bulunan ekstreler seçilir.
    // =====================================================

    const statements = statementPeriods.filter(
      (statement) =>
        statement.dueDate &&
        statement.dueDate <= selectedDate &&
        Number(statement.unpaidAmountMinor ?? 0) > 0,
    );

    // =====================================================
    // 11.GÜN
    // Seçilen tarihe kadar ödenmesi gereken bütün
    // ekstre borçları toplanır.
    // =====================================================

    const totalMinor = statements.reduce(
      (total, statement) => total + Number(statement.unpaidAmountMinor ?? 0),
      0,
    );

    return {
      totalMinor,

      statements,
    };
  },
);

// =====================================================
// 11.GÜN
// Aynı kesim tarihine sahip kredi kartlarının
// tahmini ekstre yüklerini birlikte hesaplar.
//
// Örneğin iki farklı kartın ekstresi ayın 25'inde
// kesiliyorsa, 25'inde oluşması beklenen toplam yük
// tek grup içerisinde gösterilebilir.
// =====================================================

export const selectProjectedLoadsByStatementDate = createSelector(
  [selectStatementPeriods, selectCreditCardPurchaseLoadSummaries],
  (statementPeriods, purchaseLoadSummaries) => {
    const groupedLoads = {};

    statementPeriods
      .filter(
        (statement) =>
          statement.status === "projected" &&
          statement.creditCardId &&
          statement.cycleEnd,
      )
      .forEach((statement) => {
        const statementDate = statement.cycleEnd;

        const creditCardId = statement.creditCardId;

        const purchaseLoadSummary = purchaseLoadSummaries[creditCardId] ?? {
          newSpendingMinor: 0,

          priorCommitmentBurdenMinor: 0,
        };

        // =====================================================
        // 11.GÜN
        // Bu kesim tarihi için daha önce bir grup
        // oluşturulmadıysa boş grup hazırlanır.
        // =====================================================

        if (!groupedLoads[statementDate]) {
          groupedLoads[statementDate] = {
            statementDate,

            newSpendingMinor: 0,

            priorCommitmentBurdenMinor: 0,

            projectedTotalMinor: 0,

            creditCardIds: [],
          };
        }

        const currentGroup = groupedLoads[statementDate];

        // =====================================================
        // 11.GÜN
        // Aynı tarihte ekstresi kesilecek kartın kimliği
        // grubun içerisinde saklanır.
        // =====================================================

        if (!currentGroup.creditCardIds.includes(creditCardId)) {
          currentGroup.creditCardIds.push(creditCardId);
        }

        // =====================================================
        // 11.GÜN
        // Aynı kesim günündeki kartların yeni harcamaları
        // birlikte hesaplanır.
        // =====================================================

        currentGroup.newSpendingMinor += Number(
          purchaseLoadSummary.newSpendingMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Önceki dönemlerden bu ekstreye gelen taksitler
        // yeni harcamalardan ayrı şekilde toplanır.
        // =====================================================

        currentGroup.priorCommitmentBurdenMinor += Number(
          purchaseLoadSummary.priorCommitmentBurdenMinor ?? 0,
        );

        // =====================================================
        // 11.GÜN
        // Aynı kesim gününün toplam tahmini yükü:
        //
        // Yeni harcamalar
        // +
        // Önceki dönem taksitleri
        // =====================================================

        currentGroup.projectedTotalMinor =
          currentGroup.newSpendingMinor +
          currentGroup.priorCommitmentBurdenMinor;
      });

    // =====================================================
    // 11.GÜN
    // Gruplar diziye çevrilir ve tarih sırasına dizilir.
    //
    // Böylece kullanıcı arayüzünde doğrudan map()
    // ile gösterilebilir.
    // =====================================================

    return Object.values(groupedLoads).sort((firstGroup, secondGroup) =>
      firstGroup.statementDate.localeCompare(secondGroup.statementDate),
    );
  },
);
