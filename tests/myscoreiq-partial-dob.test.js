import { describe, expect, it } from 'vitest';
import { Scraper } from '../scraper/scrapper.js';

describe('MyScoreIQ partial DOB conversion', () => {
  it('preserves year-only DOB values without inventing January 1', async () => {
    const scraper = new Scraper({});
    const report = await scraper.parseMyScoreIQ({
      rawCreditData: {
        data: [
          { bureau: 'TransUnion', year_of_birth: 1979 },
          { bureau: 'Experian', year_of_birth: 1980 },
          { bureau: 'Equifax', year_of_birth: 1981 },
        ],
      },
      sections: {},
    });

    expect(report.DOB).toEqual([
      { BureauId: 1, DOB: '--/--/1979' },
      { BureauId: 2, DOB: '--/--/1980' },
      { BureauId: 3, DOB: '--/--/1981' },
    ]);
  });
});
