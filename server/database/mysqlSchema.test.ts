import { describe, it, expect } from 'vitest';
import { getForeignKeyCleanupSql, isRecoverableForeignKeyError } from './foreignKeyUtils.js';

describe('isRecoverableForeignKeyError', () => {
  it('recognizes common MySQL foreign-key constraint failures', () => {
    expect(isRecoverableForeignKeyError({ code: 'ER_NO_REFERENCED_ROW_2', errno: 1452 })).toBe(true);
    expect(isRecoverableForeignKeyError({ code: 'ER_CANNOT_ADD_FOREIGN_KEY', errno: 1215 })).toBe(true);
    expect(isRecoverableForeignKeyError({ code: 'ER_ROW_IS_REFERENCED_2', errno: 1832 })).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isRecoverableForeignKeyError({ code: 'ER_DUP_FIELDNAME' })).toBe(false);
  });

  it('uses nulling cleanup for nullable foreign keys and deletes rows for non-nullable ones', () => {
    expect(getForeignKeyCleanupSql('integration_activity_logs', 'client_id', 'clients', true)).toContain('SET child.`client_id` = NULL');
    expect(getForeignKeyCleanupSql('integration_activity_logs', 'admin_id', 'users', false)).toContain('DELETE FROM');
  });
});
