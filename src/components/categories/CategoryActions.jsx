function CategoryActions({
  selectedCategory,
  moveParentId,
  setMoveParentId,
  moveParentOptions,
  handleMoveCategory,
  handleArchiveCategory,
  isCategoryMutating,
}) {
  if (!selectedCategory) {
    return null;
  }

  return (
    <div className="category-action-panel">
      <p className="selected-category-text">
        Seçili kategori:{" "}
        <strong>
          {selectedCategory.pathNames.join(" > ")}
        </strong>
      </p>

      <label
        className="form-label"
        htmlFor="moveParent"
      >
        Yeni Üst Kategori
      </label>

      <select
        id="moveParent"
        className="form-input"
        value={moveParentId}
        onChange={(event) =>
          setMoveParentId(event.target.value)
        }
      >
        <option value="">
          Ana kategori yap
        </option>

        {moveParentOptions.map((category) => (
          <option
            key={category.id}
            value={category.id}
          >
            {category.pathNames.join(" > ")}
          </option>
        ))}
      </select>

      <div className="category-action-buttons">
        <button
          className="secondary-button"
          type="button"
          onClick={handleMoveCategory}
          disabled={isCategoryMutating}
        >
          Kategoriyi Taşı
        </button>

        <button
          className="archive-button"
          type="button"
          onClick={handleArchiveCategory}
          disabled={isCategoryMutating}
        >
          Kategoriyi Arşivle
        </button>
      </div>
    </div>
  );
}

export default CategoryActions;