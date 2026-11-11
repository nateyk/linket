import {describe, expect, it} from 'vitest';
import {extractReceiptReference} from './receipt-reference-extractor';

describe('bank and wallet SMS extraction', () => {
  it('extracts the modern CBE receipt ID from a trusted link in a full message', () => {
    expect(extractReceiptReference('cbe',
      'Dear customer, 460.00 ETB transferred from account 1000123456789.\n'
      + 'Receipt: https://mbreciept.cbe.com.et/fHCxyTVljBclm6Yk4C.'
    )).toEqual({kind: 'found', reference: 'fHCxyTVljBclm6Yk4C'});
  });

  it('extracts CBE legacy FT number but does not fabricate an account suffix', () => {
    expect(extractReceiptReference('cbe',
      'Transfer successful. Your FT reference is FT25356LL011. Amount ETB 460.00'
    )).toEqual({kind: 'found', reference: 'FT25356LL011'});
  });

  it('extracts labelled Telebirr transaction numbers without extracting phone, recipient or balance', () => {
    expect(extractReceiptReference('telebirr',
      'You have sent ETB 460 to 0912345678. Transaction No: DET8FJGUJ4. Balance ETB 500.00'
    )).toEqual({kind: 'found', reference: 'DET8FJGUJ4'});
  });

  it('supports Telebirr Amharic SMS labels', () => {
    expect(extractReceiptReference('telebirr',
      'ለተቀባይ 0912345678 ገንዘብ ተልኳል። የሂሳብ እንቅስቃሴ ቁጥርዎ DET8FJGUJ4'
    )).toEqual({kind: 'found', reference: 'DET8FJGUJ4'});
  });

  it('extracts Telebirr reference from supported receipt URLs', () => {
    expect(extractReceiptReference('telebirr',
      'Thank you! https://transactioninfo.ethiotelecom.et/receipt/DET8FJGUJ4'
    )).toEqual({kind: 'found', reference: 'DET8FJGUJ4'});
    expect(extractReceiptReference('telebirr',
      'https://apps.ethiotelecom.et/receipt/?transactionNo=DET8FJGUJ4'
    )).toEqual({kind: 'found', reference: 'DET8FJGUJ4'});
  });

  it('retains valid manual identifiers without guessing unsupported SMS text', () => {
    expect(extractReceiptReference('cbe', 'fHCxyTVljBclm6Yk4C'))
      .toEqual({kind: 'found', reference: 'fHCxyTVljBclm6Yk4C'});
    expect(extractReceiptReference('cbe', 'Account: 1000123456789 ETB 460.00'))
      .toEqual({kind: 'none'});
    expect(extractReceiptReference('telebirr', '0912345678'))
      .toEqual({kind: 'none'});
  });

  it('never treats an unrelated or lookalike receipt host as a trusted receipt', () => {
    expect(extractReceiptReference('cbe',
      'https://mbreciept.cbe.com.et.attacker.example/FAKEREF12345'
    )).toEqual({kind: 'none'});
    expect(extractReceiptReference('telebirr',
      'https://transactioninfo.ethiotelecom.et.fake.example/receipt/DET8FJGUJ4'
    )).toEqual({kind: 'none'});
  });

  it('does not guess when a message contains different candidate receipt IDs', () => {
    expect(extractReceiptReference('telebirr',
      'Transaction No: DET8FJGUJ4\nTransaction No: CHQ1234567'
    )).toEqual({kind: 'ambiguous'});
    expect(extractReceiptReference('cbe',
      'Receipt ID: fHCxyTVljBclm6Yk4C\nReceipt ID: anotherCbeId123'
    )).toEqual({kind: 'ambiguous'});
  });

  it('refuses oversized pasted messages instead of forwarding them to the provider', () => {
    expect(extractReceiptReference('cbe', 'a'.repeat(4097))).toEqual({kind: 'none'});
  });
});
