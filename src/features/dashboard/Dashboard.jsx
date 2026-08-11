import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { calculateDashboard } from "./dashboardThunks";

import {
  selectTotalIncome,
  selectTotalExpense,
  selectTotalRefunds,
  selectNetCashFlow,
  selectSavingsRate,
  selectDashboardStatus,
  selectDashboardError,
} from "./dashboardSelectors";

// =====================================================
// 12.GÜN - 3.19
// Dashboard ve analizler ekranı.
// =====================================================

export default function Dashboard({
  onNavigateHome,
  onLogout,
}) {
    const dispatch = useDispatch();

    // =====================================================
    // 12.GÜN - 3.19
    // Transaction kayıtları Redux store içerisinden alınır.
    // =====================================================

    const transactions = useSelector(
        (state) => state.transactions.items,
    );

    // =====================================================
    // 12.GÜN - 3.19
    // Dashboard finansal değerleri alınır.
    // =====================================================

    const totalIncome = useSelector(
        selectTotalIncome,
    );

    const totalExpense = useSelector(
        selectTotalExpense,
    );

    const totalRefunds = useSelector(
        selectTotalRefunds,
    );

    const netCashFlow = useSelector(
        selectNetCashFlow,
    );

    const savingsRate = useSelector(
        selectSavingsRate,
    );

    const dashboardStatus = useSelector(
        selectDashboardStatus,
    );

    const dashboardError = useSelector(
        selectDashboardError,
    );

    // =====================================================
    // 12.GÜN - 3.19
    // Transaction değiştiğinde Dashboard yeniden hesaplanır.
    // =====================================================

    useEffect(() => {
        dispatch(
            calculateDashboard(transactions),
        );
    }, [dispatch, transactions]);

    // =====================================================
    // 12.GÜN - 3.19
    // Para değerleri TL formatına çevrilir.
    // =====================================================

    const formatCurrency = (value) => {
        return new Intl.NumberFormat(
            "tr-TR",
            {
                style: "currency",
                currency: "TRY",
            },
        ).format(Number(value || 0));
    };

    return (
        <div className="page-container dashboard-page-container">
            <div className="welcome-card transaction-card">

                <div className="dashboard-header">

                    <div className="dashboard-header-content">

                        <h1 className="welcome-title">
                            Finansal Dashboard
                        </h1>

                        <p className="page-description">
                            Finansal özet ve analizlerinizi
                            buradan takip edebilirsiniz.
                        </p>

                    </div>

                    <div className="dashboard-header-actions">

                        {onNavigateHome && (
                            <button
                                className="admin-button"
                                type="button"
                                onClick={onNavigateHome}
                            >
                                ← Anasayfaya Dön
                            </button>
                        )}

                        {onLogout && (
                            <button
                                className="logout-button dashboard-logout-button"
                                type="button"
                                onClick={onLogout}
                            >
                                Çıkış Yap
                            </button>
                        )}

                    </div>

                </div>

                {dashboardStatus === "loading" && (
                    <div className="dashboard-info-message">
                        Dashboard hesaplanıyor...
                    </div>
                )}

                {dashboardError && (
                    <div className="error-message-panel">
                        {dashboardError}
                    </div>
                )}

                {/* =====================================================
            12.GÜN - 3.19
            Finansal özet kartları.
            ===================================================== */}

                <div className="dashboard-summary-grid">

                    <div className="dashboard-summary-card">
                        <div className="dashboard-card-title">
                            Toplam Gelir
                        </div>

                        <div className="dashboard-card-value">
                            {formatCurrency(
                                totalIncome,
                            )}
                        </div>

                        <div className="dashboard-card-description">
                            Toplam gelir tutarı
                        </div>
                    </div>


                    <div className="dashboard-summary-card">
                        <div className="dashboard-card-title">
                            Toplam Gider
                        </div>

                        <div className="dashboard-card-value">
                            {formatCurrency(
                                totalExpense,
                            )}
                        </div>

                        <div className="dashboard-card-description">
                            Toplam harcama tutarı
                        </div>
                    </div>


                    <div className="dashboard-summary-card">
                        <div className="dashboard-card-title">
                            Toplam İade
                        </div>

                        <div className="dashboard-card-value">
                            {formatCurrency(
                                totalRefunds,
                            )}
                        </div>

                        <div className="dashboard-card-description">
                            Gerçekleşen iade tutarı
                        </div>
                    </div>


                    <div className="dashboard-summary-card">
                        <div className="dashboard-card-title">
                            Net Nakit Akışı
                        </div>

                        <div className="dashboard-card-value">
                            {formatCurrency(
                                netCashFlow,
                            )}
                        </div>

                        <div className="dashboard-card-description">
                            Gelir ve gider arasındaki fark
                        </div>
                    </div>


                    <div className="dashboard-summary-card">
                        <div className="dashboard-card-title">
                            Tasarruf Oranı
                        </div>

                        <div className="dashboard-card-value">
                            {Number(
                                savingsRate || 0,
                            ).toFixed(2)}
                            %
                        </div>

                        <div className="dashboard-card-description">
                            Gelire göre tasarruf oranı
                        </div>
                    </div>

                </div>

                {/* =====================================================
            12.GÜN - 3.19
            Finansal analiz açıklama alanı.
            ===================================================== */}

                <div className="dashboard-analysis-card">

                    <h2 className="dashboard-section-title">
                        Finansal Analiz
                    </h2>

                    <p className="page-description">
                        Gelir, gider, iade, net nakit akışı ve
                        tasarruf oranı bilgileri yukarıdaki
                        finansal özet kartlarında gösterilmektedir.
                    </p>

                </div>

            </div>
        </div>
    );
}