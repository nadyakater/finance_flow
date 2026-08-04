// =====================================================
// 5.2.GÜN ve 6.GÜN
// Tek bir gider satırının kategori, ürün, marka,
// miktar, birim, tutar ve indirim alanlarını gösterir.
// =====================================================

function ExpenseLineItem({
  line,
  index,
  expenseLinesCount,
  transactionCategoryOptions,
  categoryLoadStatus,
  products,
  brands,
  handleExpenseLineChange,
  handleRemoveExpenseLine,
}) {
  return (
    <div className="category-action-panel">
      <p className="selected-category-text">
        <strong>{index + 1}. Gider Satırı</strong>
      </p>

      <div className="category-form-grid">
        <div>
          <label
            className="form-label"
            htmlFor={`expenseCategory-${line.id}`}
          >
            Kategori
          </label>

          <select
            id={`expenseCategory-${line.id}`}
            className="form-input"
            value={line.categoryId}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "categoryId",
                event.target.value,
              )
            }
            disabled={
              categoryLoadStatus === "loading" ||
              transactionCategoryOptions.length === 0
            }
          >
            <option value="">Kategori seçiniz</option>

            {transactionCategoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.pathNames.join(" > ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`expenseProduct-${line.id}`}
          >
            Ürün
          </label>

          <select
            id={`expenseProduct-${line.id}`}
            className="form-input"
            value={line.productId}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "productId",
                event.target.value,
              )
            }
          >
            <option value="">Ürün bilgisi olmadan devam et</option>

            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`expenseBrand-${line.id}`}
          >
            Marka
          </label>

          <select
            id={`expenseBrand-${line.id}`}
            className="form-input"
            value={line.brandId}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "brandId",
                event.target.value,
              )
            }
          >
            <option value="">Marka seçmeyiniz</option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`purchaseQuantity-${line.id}`}
          >
            Paket / Ürün Adedi
          </label>

          <input
            id={`purchaseQuantity-${line.id}`}
            className="form-input"
            type="number"
            min="0.01"
            step="0.01"
            value={line.purchaseQuantity}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "purchaseQuantity",
                event.target.value,
              )
            }
          />
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`unitCount-${line.id}`}
          >
            Paket İçindeki Adet
          </label>

          <input
            id={`unitCount-${line.id}`}
            className="form-input"
            type="number"
            min="0.01"
            step="0.01"
            value={line.unitCount}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "unitCount",
                event.target.value,
              )
            }
          />
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`unitSize-${line.id}`}
          >
            Birim Miktarı
          </label>

          <input
            id={`unitSize-${line.id}`}
            className="form-input"
            type="number"
            min="0.01"
            step="0.01"
            value={line.unitSize}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "unitSize",
                event.target.value,
              )
            }
          />
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`unitType-${line.id}`}
          >
            Birim
          </label>

          <select
            id={`unitType-${line.id}`}
            className="form-input"
            value={line.unitType}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "unitType",
                event.target.value,
              )
            }
          >
            <option value="piece">Adet</option>
            <option value="ml">Mililitre</option>
            <option value="l">Litre</option>
            <option value="g">Gram</option>
            <option value="kg">Kilogram</option>
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`unitPrice-${line.id}`}
          >
            Paket Birim Fiyatı
          </label>

          <input
            id={`unitPrice-${line.id}`}
            className="form-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="İsteğe bağlı"
            value={line.unitPrice}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "unitPrice",
                event.target.value,
              )
            }
          />
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`expenseAmount-${line.id}`}
          >
            Satır Tutarı
          </label>

          <input
            id={`expenseAmount-${line.id}`}
            className="form-input"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Satır tutarı"
            value={line.amount}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "amount",
                event.target.value,
              )
            }
          />
        </div>

        <div>
          <label
            className="form-label"
            htmlFor={`expenseDiscount-${line.id}`}
          >
            Satır İndirimi
          </label>

          <input
            id={`expenseDiscount-${line.id}`}
            className="form-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={line.discount}
            onChange={(event) =>
              handleExpenseLineChange(
                line.id,
                "discount",
                event.target.value,
              )
            }
          />
        </div>
      </div>

      {expenseLinesCount > 1 && (
        <button
          className="archive-button"
          type="button"
          onClick={() => handleRemoveExpenseLine(line.id)}
        >
          Satırı Kaldır
        </button>
      )}
    </div>
  );
}

export default ExpenseLineItem;