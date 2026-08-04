function CategoryCreateForm({
  categoryName,
  setCategoryName,
  categoryType,
  setCategoryType,
  parentCategoryId,
  setParentCategoryId,
  parentCategoryOptions,
  handleCreateCategory,
  isCategoryMutating,
}) {
  return (
    <form
      className="category-form"
      onSubmit={handleCreateCategory}
    >
      <div className="category-form-grid">
        <div>
          <label
            className="form-label"
            htmlFor="categoryName"
          >
            Kategori Adı
          </label>

          <input
            id="categoryName"
            className="form-input"
            type="text"
            placeholder="Kategori adı giriniz"
            value={categoryName}
            onChange={(event) =>
              setCategoryName(event.target.value)
            }
          />
        </div>

        <div>
          <label
            className="form-label"
            htmlFor="categoryType"
          >
            Kategori Türü
          </label>

          <select
            id="categoryType"
            className="form-input"
            value={categoryType}
            onChange={(event) =>
              setCategoryType(event.target.value)
            }
          >
            <option value="income">
              Gelir
            </option>

            <option value="expense">
              Gider
            </option>

            <option value="both">
              Gelir ve Gider
            </option>
          </select>
        </div>

        <div>
          <label
            className="form-label"
            htmlFor="parentCategory"
          >
            Üst Kategori
          </label>

          <select
            id="parentCategory"
            className="form-input"
            value={parentCategoryId}
            onChange={(event) =>
              setParentCategoryId(event.target.value)
            }
          >
            <option value="">
              Ana kategori
            </option>

            {parentCategoryOptions.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.pathNames.join(" > ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="add-button"
        type="submit"
        disabled={isCategoryMutating}
      >
        {isCategoryMutating
          ? "İşlem Yapılıyor..."
          : "Kategori Ekle"}
      </button>
    </form>
  );
}

export default CategoryCreateForm;