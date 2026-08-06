import { describe, expect, it } from 'vitest';
import {
  preferExactDisputeLetterRoundRows,
  selectDisputeLetterCategoryRoundRows,
} from '../server/utils/disputeLetterContentLookup';

describe('dispute letter content round lookup', () => {
  it('uses exact-category all-round BASIC rows when a requested round has none', () => {
    const allRoundBasicRows = [
      {
        id: 1,
        round: 0,
        category: 'All Other Charge-Offs/Collections',
        type: 'BASIC',
      },
    ];

    expect(
      preferExactDisputeLetterRoundRows(allRoundBasicRows, 4),
    ).toEqual(allRoundBasicRows);
  });

  it('prefers requested-round content over all-round content', () => {
    const exactRow = {
      id: 1,
      round: 3,
      category: 'All Other Charge-Offs/Collections',
      type: 'BASIC',
    };
    const allRoundRow = {
      id: 2,
      round: 0,
      category: 'All Other Charge-Offs/Collections',
      type: 'BASIC',
    };

    expect(
      preferExactDisputeLetterRoundRows([exactRow, allRoundRow], 3),
    ).toEqual([exactRow]);
  });

  it('never returns rows from a different numbered round', () => {
    const wrongRoundRow = { id: 1, round: 2 };

    expect(
      preferExactDisputeLetterRoundRows([wrongRoundRow], 5),
    ).toEqual([]);
  });

  it('uses exact collection category rows without mixing broad BASIC rows', () => {
    const exactRow = {
      id: 1,
      round: 1,
      category: 'All Other Charge-Offs/Collections',
    };
    const broadRow = {
      id: 2,
      round: 1,
      category: 'Charge Off Collection Repossession',
    };

    expect(
      selectDisputeLetterCategoryRoundRows(
        [broadRow, exactRow],
        1,
        [
          'All Other Charge-Offs/Collections',
          'Charge Off Collection Repossession',
        ],
      ),
    ).toEqual({
      category: 'All Other Charge-Offs/Collections',
      rows: [exactRow],
    });
  });

  it('uses the broad collection BASIC category only when the exact category is empty', () => {
    const broadRows = [
      {
        id: 1,
        round: 4,
        category: 'Charge Off Collection Repossession',
      },
      {
        id: 2,
        round: 4,
        category: 'Charge Off Collection Repossession',
      },
    ];

    expect(
      selectDisputeLetterCategoryRoundRows(
        broadRows,
        4,
        [
          'All Other Charge-Offs/Collections',
          'Charge Off Collection Repossession',
        ],
      ),
    ).toEqual({
      category: 'Charge Off Collection Repossession',
      rows: broadRows,
    });
  });
});
