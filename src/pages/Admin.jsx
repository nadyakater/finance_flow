import {
  useEffect,
  useMemo,
} from "react";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  logoutUser,
} from "../features/auth/application/authThunks";

import {
  selectAuthStatus,
  selectCurrentUser,
} from "../features/auth/presentation/authSelectors";

import {
  loadCategories,
} from "../features/categories/application/categoryThunks";

import {
  selectActiveCategories,
} from "../features/categories/presentation/categorySelectors";

import {
  loadCatalog,
} from "../features/catalog/application/catalogThunks";

import {
  loadCreditCards,
} from "../features/creditCards/application/creditCardThunks";

import {
  loadTransactions,
} from "../features/transactions/application/transactionThunks";

import {
  selectTransactions,
} from "../features/transactions/presentation/transactionSelectors";

import CategorySection from "../components/categories/CategorySection";

import CatalogSection from "../features/catalog/presentation/components/CatalogSection";

import CreditCardSection from "../features/creditCards/presentation/components/CreditCardSection";

import ProductAnalysis from "../features/transactions/presentation/components/ProductAnalysis";

import FuelAnalysis from "../features/transactions/presentation/components/FuelAnalysis";


// =====================================================
// 11.GÜN
// 3.17 kapsamında oluşturulan düzenli gider,
// fatura ve abonelik yönetim bölümü Admin Paneli'ne
// taşındı.
//
// Ana sayfada artık gösterilmez.
// =====================================================

import RecurringExpenseSection from "../features/recurring/presentation/components/RecurringExpenseSection";


function formatDate(
  dateValue,
) {
  if (!dateValue) {
    return "-";
  }

  return new Date(
    dateValue,
  ).toLocaleString(
    "tr-TR",
  );
}


function formatAmount(
  amountMinor,
) {
  return (
    Number(
      amountMinor ?? 0,
    ) / 100
  ).toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  );
}


function convertInputAmountToMinor(
  amount,
) {
  if (
    amount === "" ||
    amount === null ||
    amount === undefined
  ) {
    return 0;
  }

  const normalizedAmount =
    typeof amount ===
    "string"
      ? amount.replace(
          ",",
          ".",
        )
      : amount;

  const numericAmount =
    Number(
      normalizedAmount,
    );

  if (
    !Number.isFinite(
      numericAmount,
    )
  ) {
    return 0;
  }

  return Math.round(
    numericAmount *
      100,
  );
}


function getTransactionCategoryPathIds(
  transaction,
  categories,
) {
  if (
    Array.isArray(
      transaction.categoryPathIds,
    ) &&
    transaction.categoryPathIds.length >
      0
  ) {
    return transaction.categoryPathIds;
  }

  if (
    transaction.categoryId
  ) {
    return [
      transaction.categoryId,
    ];
  }

  const expectedCategoryType =
    transaction.transactionType ===
    "Gelir"
      ? "income"
      : "expense";

  const matchedCategory =
    categories.find(
      (
        category,
      ) =>
        category.name ===
          transaction.category &&
        (
          category.categoryType ===
            expectedCategoryType ||
          category.categoryType ===
            "both"
        ),
    );

  return (
    matchedCategory?.pathIds ??
    []
  );
}


function getTransactionCategoryItems(
  transaction,
  categories,
) {
  if (
    Array.isArray(
      transaction.lines,
    ) &&
    transaction.lines.length >
      0
  ) {
    return transaction.lines.map(
      (
        line,
      ) => {
        const lineAmountMinor =
          Number.isInteger(
            line.netAmountMinor,
          )
            ? line.netAmountMinor
            : Number.isInteger(
                  line.grossAmountMinor,
                )
              ? line.grossAmountMinor -
                Number(
                  line.lineDiscountMinor ??
                    0,
                ) -
                Number(
                  line.allocatedTransactionDiscountMinor ??
                    0,
                )
              : convertInputAmountToMinor(
                  line.amount,
                );

        return {
          categoryId:
            line.categoryId ??
            "",

          categoryPathIds:
            Array.isArray(
              line.categoryPathIds,
            )
              ? line.categoryPathIds
              : line.categoryId
                ? [
                    line.categoryId,
                  ]
                : [],

          amountMinor:
            lineAmountMinor,
        };
      },
    );
  }

  return [
    {
      categoryId:
        transaction.categoryId ??
        "",

      categoryPathIds:
        getTransactionCategoryPathIds(
          transaction,
          categories,
        ),

      amountMinor:
        Number(
          transaction.amountMinor ??
            0,
        ),
    },
  ];
}


// =====================================================
// 10.GÜN
// Kategori, katalog, kredi kartı ve analiz bölümleri
// için Admin sayfası oluşturuldu.
// =====================================================


// =====================================================
// 11.GÜN
// Düzenli giderler, faturalar ve abonelikler
// Admin Paneli içerisine taşındı.
//
// Böylece yönetim ağırlıklı özellikler tek bir
// ekranda toplanmış oldu.
// =====================================================

function Admin({
  onNavigateHome,
}) {
  const dispatch =
    useDispatch();

  const currentUser =
    useSelector(
      selectCurrentUser,
    );

  const authStatus =
    useSelector(
      selectAuthStatus,
    );

  const transactions =
    useSelector(
      selectTransactions,
    );

  const activeCategories =
    useSelector(
      selectActiveCategories,
    );

  const isLoggingOut =
    authStatus ===
    "loading";


  const categoryTotals =
    useMemo(
      () => {
        const totals = {};

        activeCategories.forEach(
          (
            category,
          ) => {
            totals[
              category.id
            ] = {
              incomeMinor:
                0,

              expenseMinor:
                0,
            };
          },
        );

        transactions.forEach(
          (
            transaction,
          ) => {
            const categoryItems =
              getTransactionCategoryItems(
                transaction,
                activeCategories,
              );

            categoryItems.forEach(
              (
                categoryItem,
              ) => {
                categoryItem.categoryPathIds.forEach(
                  (
                    pathCategoryId,
                  ) => {
                    if (
                      !totals[
                        pathCategoryId
                      ]
                    ) {
                      return;
                    }

                    if (
                      transaction.transactionType ===
                      "Gelir"
                    ) {
                      totals[
                        pathCategoryId
                      ].incomeMinor +=
                        categoryItem.amountMinor;
                    } else if (
                      transaction.transactionType ===
                      "İade"
                    ) {
                      totals[
                        pathCategoryId
                      ].expenseMinor -=
                        categoryItem.amountMinor;
                    } else {
                      totals[
                        pathCategoryId
                      ].expenseMinor +=
                        categoryItem.amountMinor;
                    }
                  },
                );
              },
            );
          },
        );

        return totals;
      },
      [
        activeCategories,
        transactions,
      ],
    );


  // =====================================================
  // 11.GÜN
  // Admin ekranı açıldığında kategori, katalog,
  // kredi kartı ve işlem verileri yüklenir.
  //
  // RecurringExpenseSection kendi recurring verilerini
  // kendi içerisinde yüklediği için burada tekrar
  // loadRecurringRules çağrılmaz.
  // =====================================================

  useEffect(
    () => {
      if (
        !currentUser?.id
      ) {
        return;
      }

      dispatch(
        loadTransactions(
          currentUser.id,
        ),
      );

      dispatch(
        loadCategories(
          currentUser.id,
        ),
      );

      dispatch(
        loadCatalog(
          currentUser.id,
        ),
      );

      dispatch(
        loadCreditCards(
          currentUser.id,
        ),
      );
    },
    [
      dispatch,
      currentUser?.id,
    ],
  );


  const handleLogout =
    async () => {
      await dispatch(
        logoutUser(),
      );
    };


  return (
    <div className="page-container dashboard-page-container">
      <div className="welcome-card transaction-card">
        {/* =====================================================
            10.GÜN
            Admin sayfasına geri dönüş ve çıkış işlemleri
            eklendi.
            ===================================================== */}

        <div className="dashboard-header admin-header">
          <div className="dashboard-header-content">
            <h1 className="welcome-title">
              Admin Paneli
            </h1>

            <p className="page-description">
              Yönetim ve analiz bölümlerine erişim sağlandı.
            </p>

            <p className="user-email">
              {currentUser?.email}
            </p>
          </div>


          <div className="dashboard-header-actions">
            <button
              className="home-button"
              type="button"
              onClick={
                onNavigateHome
              }
            >
              Ana Sayfaya Dön
            </button>

            <button
              className="logout-button dashboard-logout-button"
              type="button"
              onClick={
                handleLogout
              }
              disabled={
                isLoggingOut
              }
            >
              {isLoggingOut
                ? "Çıkış Yapılıyor..."
                : "Çıkış Yap"}
            </button>
          </div>
        </div>


        {/* =====================================================
            Kategori yönetimi
            ===================================================== */}

        <CategorySection
          categoryTotals={
            categoryTotals
          }
          formatAmount={
            formatAmount
          }
        />


        {/* =====================================================
            Firma, şube, marka ve ürün katalog yönetimi
            ===================================================== */}

        <CatalogSection />


        {/* =====================================================
            Kredi kartı yönetimi ve analizleri
            ===================================================== */}

        <CreditCardSection />


        {/* =====================================================
            11.GÜN - 3.17

            Düzenli giderler, faturalar ve abonelikler
            Admin Paneli içerisine taşındı.

            Kullanıcı burada:

            - kira,
            - internet,
            - sigorta,
            - abonelik

            gibi tekrar eden giderleri yönetebilir.

            Forecast kayıtları gerçek transaction değildir.
            Gerçek ödeme yapıldığında normal gider kaydı
            oluşturulur ve forecast paid durumuna geçirilir.
            ===================================================== */}

        <RecurringExpenseSection />


        {/* =====================================================
            Ürün fiyat analizi
            ===================================================== */}

        <ProductAnalysis
          formatDate={
            formatDate
          }
          formatAmount={
            formatAmount
          }
        />


        {/* =====================================================
            Yakıt analizi
            ===================================================== */}

        <FuelAnalysis
          formatDate={
            formatDate
          }
          formatAmount={
            formatAmount
          }
        />
      </div>
    </div>
  );
}

export default Admin;