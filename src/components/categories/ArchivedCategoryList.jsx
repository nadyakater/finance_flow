function getCategoryTypeLabel(categoryType) {
  const labels = {
    income: "Gelir",
    expense: "Gider",
    both: "Gelir ve Gider",
  };

  return labels[categoryType] ?? categoryType;
}

function ArchivedCategoryList({
  archivedCategories,
  handleRestoreCategory,
  isCategoryMutating,
}) {
  return (
    <div className="archive-section">
      <h3 className="archive-title">
        Arşivlenen Kategoriler
      </h3>

      {archivedCategories.length === 0 ? (
        <p className="empty-message">
          Arşivlenmiş kategori bulunmuyor.
        </p>
      ) : (
        <div className="archive-list">
          {archivedCategories.map((category) => (
            <div
              className="archive-item"
              key={category.id}
            >
              <div>
                <p className="archive-category-name">
                  {category.pathNames.join(" > ")}
                </p>

                <span className="archive-category-type">
                  {getCategoryTypeLabel(
                    category.categoryType,
                  )}
                </span>
              </div>

              <button
                className="restore-button"
                type="button"
                onClick={() =>
                  handleRestoreCategory(category)
                }
                disabled={isCategoryMutating}
              >
                Arşivden Çıkar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ArchivedCategoryList;