import ExpenseLineItem from "./ExpenseLineItem";

// =====================================================
// 7.GÜN
// Çok satırlı gider formunun firma, şube, satırlar
// ve indirim alanlarını gösterir.
//
// 8.GÜN
// Gider alanları daha anlaşılır hale getirildi.
// Kupon kodu ve elle girilen net toplam kaldırıldı.
// Toplam gider otomatik olarak hesaplanır.
// =====================================================

function ExpenseForm({
  merchantId,
  setMerchantId,
  merchants,
  branchId,
  setBranchId,
  merchantBranches,
  expenseLines,
  transactionCategoryOptions,
  categoryLoadStatus,
  products,
  brands,
  handleExpenseLineChange,
  handleRemoveExpenseLine,
  handleAddExpenseLine,
  transactionDiscount,
  setTransactionDiscount,
  expenseTotals,
  formatAmount,
}) {
  return (
    <>
      <div className="form-row">
        <div>
          <label
            className="form-label"
            htmlFor="expenseMerchant"
          >
            Firma / Mağaza
          </label>

          <select
            id="expenseMerchant"
            className="form-input"
            value={merchantId}
            onChange={(event) =>
              setMerchantId(
                event.target.value,
              )
            }
          >
            <option value="">
              Firma seçmeden devam et
            </option>

            {merchants.map(
              (merchant) => (
                <option
                  key={merchant.id}
                  value={merchant.id}
                >
                  {merchant.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor="expenseBranch"
          >
            Şube
          </label>

          <select
            id="expenseBranch"
            className="form-input"
            value={branchId}
            onChange={(event) =>
              setBranchId(
                event.target.value,
              )
            }
            disabled={!merchantId}
          >
            <option value="">
              Şube seçmeden devam et
            </option>

            {merchantBranches.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="category-action-panel">
        <h3 className="archive-title">
          Gider Satırları
        </h3>

        <p className="empty-message">
          Aynı işlem içerisindeki farklı
          ürün veya kategorileri ayrı gider
          satırları olarak ekleyebilirsiniz.
        </p>

        {transactionCategoryOptions.length ===
          0 && (
          <p className="form-error">
            Gider kategorisi bulunmuyor.
            Önce gider türünde bir kategori
            oluşturunuz.
          </p>
        )}

        {expenseLines.map(
          (line, index) => (
            <ExpenseLineItem
              key={line.id}
              line={line}
              index={index}
              expenseLinesCount={
                expenseLines.length
              }
              transactionCategoryOptions={
                transactionCategoryOptions
              }
              categoryLoadStatus={
                categoryLoadStatus
              }
              products={products}
              brands={brands}
              handleExpenseLineChange={
                handleExpenseLineChange
              }
              handleRemoveExpenseLine={
                handleRemoveExpenseLine
              }
            />
          ),
        )}

        <button
          className="secondary-button"
          type="button"
          onClick={
            handleAddExpenseLine
          }
          disabled={
            transactionCategoryOptions.length ===
            0
          }
        >
          Yeni Gider Satırı Ekle
        </button>
      </div>

      <div className="form-row">
        <div>
          <label
            className="form-label"
            htmlFor="transactionDiscount"
          >
            Genel İşlem İndirimi
          </label>

          <input
            id="transactionDiscount"
            className="form-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={
              transactionDiscount
            }
            onChange={(event) =>
              setTransactionDiscount(
                event.target.value,
              )
            }
          />
        </div>
      </div>

      <div className="category-action-panel expense-total-panel">
        <p className="selected-category-text">
          Satır Toplamı:{" "}
          <strong>
            {formatAmount(
              expenseTotals.subtotalMinor,
            )}{" "}
            ₺
          </strong>
        </p>

        <p className="selected-category-text">
          Satır İndirimleri:{" "}
          <strong>
            {formatAmount(
              expenseTotals.lineDiscountTotalMinor,
            )}{" "}
            ₺
          </strong>
        </p>

        <p className="selected-category-text">
          Genel İşlem İndirimi:{" "}
          <strong>
            {formatAmount(
              expenseTotals.transactionDiscountMinor,
            )}{" "}
            ₺
          </strong>
        </p>

        <p className="selected-category-text">
          Toplam Gider:{" "}
          <strong>
            {formatAmount(
              expenseTotals.netTotalMinor,
            )}{" "}
            ₺
          </strong>
        </p>
      </div>
    </>
  );
}

export default ExpenseForm;