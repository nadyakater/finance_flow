import { createSelector } from "@reduxjs/toolkit";

const selectCategoryState = (state) =>
  state.categories;

export const selectCategories = (
  state,
) => selectCategoryState(state).items;

export const selectCategoryLoadStatus = (
  state,
) =>
  selectCategoryState(state).loadStatus;

export const selectCategoryMutationStatus =
  (state) =>
    selectCategoryState(
      state,
    ).mutationStatus;

export const selectCategoryError = (
  state,
) => selectCategoryState(state).error;

// 5.GÜN - Arşivlenmemiş kategorileri seçen selector oluşturuldu.
export const selectActiveCategories =
  createSelector(
    [selectCategories],
    (categories) =>
      categories.filter(
        (category) =>
          !category.isArchived,
      ),
  );

// 5.GÜN - Arşivlenen kategorileri seçen selector oluşturuldu.
export const selectArchivedCategories =
  createSelector(
    [selectCategories],
    (categories) =>
      categories
        .filter(
          (category) =>
            category.isArchived,
        )
        .sort(
          (
            firstCategory,
            secondCategory,
          ) =>
            firstCategory.pathNames
              .join(" > ")
              .localeCompare(
                secondCategory.pathNames.join(
                  " > ",
                ),
                "tr",
              ),
        ),
  );

// 5.GÜN - Kategorileri sınırsız derinlikte ağaç yapısına dönüştüren selector oluşturuldu.
export const selectCategoryTree =
  createSelector(
    [selectActiveCategories],
    (categories) => {
      const categoryMap = new Map();

      categories.forEach(
        (category) => {
          categoryMap.set(category.id, {
            ...category,
            children: [],
          });
        },
      );

      const rootCategories = [];

      categories.forEach(
        (category) => {
          const categoryNode =
            categoryMap.get(category.id);

          if (
            category.parentId &&
            categoryMap.has(
              category.parentId,
            )
          ) {
            categoryMap
              .get(category.parentId)
              .children.push(
                categoryNode,
              );
          } else {
            rootCategories.push(
              categoryNode,
            );
          }
        },
      );

      function sortTree(nodes) {
        nodes.sort(
          (
            firstCategory,
            secondCategory,
          ) =>
            firstCategory.name.localeCompare(
              secondCategory.name,
              "tr",
            ),
        );

        nodes.forEach((node) => {
          sortTree(node.children);
        });
      }

      sortTree(rootCategories);

      return rootCategories;
    },
  );