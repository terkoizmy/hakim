/** Data bersama untuk mode mock: nama perusahaan & id trial mock. */

export const MOCK_TRIAL_ID = 'tr_mock_bbcA01';

export const COMPANY_NAMES: Record<string, string> = {
  BBCA: 'PT Bank Central Asia Tbk',
  BBRI: 'PT Bank Rakyat Indonesia (Persero) Tbk',
  CUAN: 'PT Petrindo Jaya Kreator Tbk',
  GOTO: 'PT GoTo Gojek Tokopedia Tbk',
  BRMS: 'PT Bumi Resources Minerals Tbk',
};

export function companyNameFor(ticker: string): string {
  return COMPANY_NAMES[ticker] ?? `PT ${ticker}`;
}
