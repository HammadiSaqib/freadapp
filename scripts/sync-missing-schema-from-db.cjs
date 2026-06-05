const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function parseCreateTable(createTableSql) {
  const lines = createTableSql.split('\n');
  const columnOrder = [];
  const columnDefinitions = new Map();

  for (const line of lines) {
    const match = line.match(/^\s*`([^`]+)`\s+(.+?)(,)?$/);
    if (!match) {
      continue;
    }

    const columnName = match[1];
    const definition = line.trim().replace(/,$/, '');
    columnOrder.push(columnName);
    columnDefinitions.set(columnName, definition);
  }

  return { columnOrder, columnDefinitions };
}

async function main() {
  const sourceDb = process.argv[2] || process.env.SOURCE_DB || 'creditrepair_db';
  const targetDb = process.argv[3] || process.env.TARGET_DB || process.env.DB_NAME || process.env.MYSQL_DATABASE || 'creditrepair_db';
  const outputDir = path.join(process.cwd(), 'logs');
  const timestamp = formatTimestamp();
  const sqlLogPath = path.join(outputDir, `schema-sync-${targetDb}-from-${sourceDb}-${timestamp}.sql`);
  const summaryPath = path.join(outputDir, `schema-sync-${targetDb}-from-${sourceDb}-${timestamp}.json`);

  const queryLog = [];
  const summary = {
    sourceDb,
    targetDb,
    createdTables: [],
    addedColumns: [],
    verification: null,
  };

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10),
    multipleStatements: false,
  });

  async function runSql(sql) {
    queryLog.push(sql.trim().endsWith(';') ? sql.trim() : `${sql.trim()};`);
    return connection.query(sql);
  }

  function writeLogs() {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(sqlLogPath, `${queryLog.join('\n\n')}\n`, 'utf8');
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  try {
    const [sourceTablesRows] = await runSql(
      `SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '${sourceDb}'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME`
    );

    const [targetTablesRows] = await runSql(
      `SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '${targetDb}'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME`
    );

    const sourceTables = sourceTablesRows.map((row) => row.TABLE_NAME);
    const targetTables = new Set(targetTablesRows.map((row) => row.TABLE_NAME));
    const missingTables = sourceTables.filter((tableName) => !targetTables.has(tableName));
    const commonTables = sourceTables.filter((tableName) => targetTables.has(tableName));

    const [sourceColumnsRows] = await runSql(
      `SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '${sourceDb}'
ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );

    const [targetColumnsRows] = await runSql(
      `SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '${targetDb}'
ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );

    const sourceColumnsByTable = new Map();
    for (const row of sourceColumnsRows) {
      if (!sourceColumnsByTable.has(row.TABLE_NAME)) {
        sourceColumnsByTable.set(row.TABLE_NAME, []);
      }
      sourceColumnsByTable.get(row.TABLE_NAME).push(row.COLUMN_NAME);
    }

    const targetColumnsByTable = new Map();
    for (const row of targetColumnsRows) {
      if (!targetColumnsByTable.has(row.TABLE_NAME)) {
        targetColumnsByTable.set(row.TABLE_NAME, []);
      }
      targetColumnsByTable.get(row.TABLE_NAME).push(row.COLUMN_NAME);
    }

    const tablesNeedingCreateSql = [...new Set([...missingTables, ...commonTables])];
    const sourceCreateMap = new Map();
    for (const tableName of tablesNeedingCreateSql) {
      const [createRows] = await runSql(`SHOW CREATE TABLE ${escapeIdentifier(sourceDb)}.${escapeIdentifier(tableName)}`);
      sourceCreateMap.set(tableName, createRows[0]['Create Table']);
    }

    await runSql('SET FOREIGN_KEY_CHECKS = 0');

    for (const tableName of missingTables) {
      const sourceCreateSql = sourceCreateMap.get(tableName);
      const targetCreateSql = sourceCreateSql.replace(
        /^CREATE TABLE `([^`]+)`/,
        `CREATE TABLE ${escapeIdentifier(targetDb)}.${escapeIdentifier(tableName)}`
      );

      await runSql(targetCreateSql);
      summary.createdTables.push(tableName);
      targetColumnsByTable.set(tableName, [...(sourceColumnsByTable.get(tableName) || [])]);
    }

    for (const tableName of commonTables) {
      const sourceColumnOrder = sourceColumnsByTable.get(tableName) || [];
      const currentTargetColumns = [...(targetColumnsByTable.get(tableName) || [])];
      const currentTargetColumnSet = new Set(currentTargetColumns);
      const { columnDefinitions } = parseCreateTable(sourceCreateMap.get(tableName));

      for (const columnName of sourceColumnOrder) {
        if (currentTargetColumnSet.has(columnName)) {
          continue;
        }

        const columnDefinition = columnDefinitions.get(columnName);
        if (!columnDefinition) {
          throw new Error(`Unable to parse source definition for ${tableName}.${columnName}`);
        }

        let placement = 'FIRST';
        for (let index = sourceColumnOrder.indexOf(columnName) - 1; index >= 0; index -= 1) {
          const previousColumn = sourceColumnOrder[index];
          if (currentTargetColumnSet.has(previousColumn)) {
            placement = `AFTER ${escapeIdentifier(previousColumn)}`;
            break;
          }
        }

        const alterSql = `ALTER TABLE ${escapeIdentifier(targetDb)}.${escapeIdentifier(tableName)} ADD COLUMN ${columnDefinition} ${placement}`;
        await runSql(alterSql);

        const sourceIndex = sourceColumnOrder.indexOf(columnName);
        let insertIndex = 0;
        for (let index = sourceIndex - 1; index >= 0; index -= 1) {
          const previousColumn = sourceColumnOrder[index];
          const targetIndex = currentTargetColumns.indexOf(previousColumn);
          if (targetIndex !== -1) {
            insertIndex = targetIndex + 1;
            break;
          }
        }

        currentTargetColumns.splice(insertIndex, 0, columnName);
        currentTargetColumnSet.add(columnName);
        summary.addedColumns.push({ table: tableName, column: columnName });
      }

      targetColumnsByTable.set(tableName, currentTargetColumns);
    }

    await runSql('SET FOREIGN_KEY_CHECKS = 1');

    const [verifySourceTablesRows] = await runSql(
      `SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '${sourceDb}'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME`
    );

    const [verifyTargetTablesRows] = await runSql(
      `SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '${targetDb}'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME`
    );

    const verifyTargetTableSet = new Set(verifyTargetTablesRows.map((row) => row.TABLE_NAME));
    const remainingMissingTables = verifySourceTablesRows
      .map((row) => row.TABLE_NAME)
      .filter((tableName) => !verifyTargetTableSet.has(tableName));

    const [verifySourceColumnsRows] = await runSql(
      `SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '${sourceDb}'
ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );

    const [verifyTargetColumnsRows] = await runSql(
      `SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '${targetDb}'
ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );

    const verifyTargetColumnsSet = new Set(
      verifyTargetColumnsRows.map((row) => `${row.TABLE_NAME}.${row.COLUMN_NAME}`)
    );

    const remainingMissingColumns = verifySourceColumnsRows
      .map((row) => `${row.TABLE_NAME}.${row.COLUMN_NAME}`)
      .filter((columnKey) => !verifyTargetColumnsSet.has(columnKey));

    summary.verification = {
      remainingMissingTables,
      remainingMissingColumns,
      success: remainingMissingTables.length === 0 && remainingMissingColumns.length === 0,
    };

    writeLogs();

    if (!summary.verification.success) {
      throw new Error(
        `Verification failed. Remaining missing tables: ${remainingMissingTables.length}, remaining missing columns: ${remainingMissingColumns.length}`
      );
    }

    console.log(`Source DB: ${sourceDb}`);
    console.log(`Target DB: ${targetDb}`);
    console.log(`Created tables: ${summary.createdTables.length}`);
    console.log(`Added columns: ${summary.addedColumns.length}`);
    console.log(`SQL log: ${sqlLogPath}`);
    console.log(`Summary: ${summaryPath}`);
  } catch (error) {
    try {
      await runSql('SET FOREIGN_KEY_CHECKS = 1');
    } catch (restoreError) {
      console.error('Failed to restore FOREIGN_KEY_CHECKS:', restoreError.message);
    }

    summary.error = error.message;
    writeLogs();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});