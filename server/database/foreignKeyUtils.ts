export function isRecoverableForeignKeyError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  const errno = (error as { errno?: number } | undefined)?.errno;

  return (
    code === 'ER_NO_REFERENCED_ROW_2' ||
    code === 'ER_NO_REFERENCED_ROW' ||
    code === 'ER_CANNOT_ADD_FOREIGN_KEY' ||
    code === 'ER_FK_NO_INDEX_CHILD' ||
    code === 'ER_ROW_IS_REFERENCED_2' ||
    errno === 1452 ||
    errno === 1215 ||
    errno === 1832
  );
}

export function getForeignKeyCleanupSql(
  tableName: string,
  columnName: string,
  parentTableName: string,
  nullableColumn = false
): string {
  if (nullableColumn) {
    return `UPDATE \`${tableName}\` AS child
LEFT JOIN \`${parentTableName}\` AS parent ON child.\`${columnName}\` = parent.id
SET child.\`${columnName}\` = NULL
WHERE child.\`${columnName}\` IS NOT NULL
  AND parent.id IS NULL`;
  }

  return `DELETE FROM \`${tableName}\`
WHERE \`${columnName}\` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM \`${parentTableName}\` AS parent
    WHERE parent.id = \`${tableName}\`.\`${columnName}\`
  )`;
}
