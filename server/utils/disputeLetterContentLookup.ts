export type DisputeLetterRoundRow = {
  round?: unknown;
};

export type DisputeLetterCategoryRoundRow = DisputeLetterRoundRow & {
  category?: unknown;
};

/**
 * Prefer content authored for the requested round. Round 0 is the shared
 * "all rounds" scope and is used only when that exact round has no rows.
 */
export const preferExactDisputeLetterRoundRows = <
  T extends DisputeLetterRoundRow,
>(
  rows: T[],
  requestedRound: number,
): T[] => {
  const exactRows = rows.filter(
    (row) => Number(row.round) === requestedRound,
  );

  if (exactRows.length > 0) return exactRows;

  return rows.filter((row) => Number(row.round) === 0);
};

/**
 * Select one category source without mixing clauses from category aliases.
 * Category names are ordered from most specific to least specific.
 */
export const selectDisputeLetterCategoryRoundRows = <
  T extends DisputeLetterCategoryRoundRow,
>(
  rows: T[],
  requestedRound: number,
  orderedCategoryNames: readonly string[],
): { category: string | null; rows: T[] } => {
  for (const categoryName of orderedCategoryNames) {
    const normalizedCategoryName = String(categoryName || '').trim().toLowerCase();
    if (!normalizedCategoryName) continue;

    const categoryRows = rows.filter(
      (row) =>
        String(row.category || '').trim().toLowerCase() ===
        normalizedCategoryName,
    );
    const selectedRows = preferExactDisputeLetterRoundRows(
      categoryRows,
      requestedRound,
    );

    if (selectedRows.length > 0) {
      return { category: categoryName, rows: selectedRows };
    }
  }

  return { category: null, rows: [] };
};
