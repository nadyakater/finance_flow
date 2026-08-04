// =====================================================
// 5.GÜN
// Gelir ve gider tablosu için kategori filtreleme alanı.
// =====================================================

function CategoryFilter({
  selectedFilterCategoryIds,
  setSelectedFilterCategoryIds,
  includeDescendants,
  setIncludeDescendants,
  activeCategories,
  handleCategoryFilterChange,
}) {
  return (
    <section className="category-filter-section">
      <div className="filter-heading-row">
        <h2 className="section-title">Kategori Filtresi</h2>

        <button
          className="filter-clear-button"
          type="button"
          onClick={() => setSelectedFilterCategoryIds([])}
          disabled={selectedFilterCategoryIds.length === 0}
        >
          Filtreyi Temizle
        </button>
      </div>

      <label className="include-descendants-label">
        <input
          type="checkbox"
          checked={includeDescendants}
          onChange={(event) => setIncludeDescendants(event.target.checked)}
        />
        Alt kategorileri dahil et
      </label>

      <div className="category-filter-list">
        {activeCategories.map((category) => (
          <label className="category-filter-item" key={category.id}>
            <input
              type="checkbox"
              checked={selectedFilterCategoryIds.includes(category.id)}
              onChange={() => handleCategoryFilterChange(category.id)}
            />

            <span>{category.pathNames.join(" > ")}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default CategoryFilter;