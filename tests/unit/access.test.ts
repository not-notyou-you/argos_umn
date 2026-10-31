import { describe, expect, it } from 'vitest';
import { canAccessCommittee, canLogin, isPositionActive, monthEnd, monthStart, todayInJakarta } from '@/lib/access';

const onboarded = { kind: 'member', isActive: true, memberStatus: 'onboarded' } as const;
const offboarded = { ...onboarded, memberStatus: 'offboarded' } as const;
const system = { kind: 'system', isActive: true, memberStatus: null } as const;
const president = { grantsCommittee: true, startDate: '2025-07-01', endDate: '2025-07-31' };

describe('bulan posisi', () => {
  it('menghitung hari terakhir bulan, termasuk kabisat', () => {
    expect(monthStart('2025-07')).toBe('2025-07-01');
    expect(monthEnd('2025-07')).toBe('2025-07-31');
    expect(monthEnd('2024-02')).toBe('2024-02-29');
    expect(monthEnd('2025-02')).toBe('2025-02-28');
  });
});

describe('zona waktu', () => {
  it('memakai tanggal WIB', () => {
    expect(todayInJakarta(new Date('2025-07-31T16:59:00Z'))).toBe('2025-07-31');
    expect(todayInJakarta(new Date('2025-07-31T17:00:00Z'))).toBe('2025-08-01');
  });
});

describe('posisi berlaku', () => {
  it('berlaku sampai hari terakhir bulan selesai', () => {
    expect(isPositionActive(president, '2025-06-30')).toBe(false);
    expect(isPositionActive(president, '2025-07-01')).toBe(true);
    expect(isPositionActive(president, '2025-07-31')).toBe(true);
    expect(isPositionActive(president, '2025-08-01')).toBe(false);
  });
  it('tanpa tanggal selesai tetap berlaku', () => {
    expect(isPositionActive({ startDate: '2025-07-01', endDate: null }, '2030-01-01')).toBe(true);
  });
});

describe('login', () => {
  it('menolak offboarded dan akun nonaktif', () => {
    expect(canLogin(onboarded)).toBe(true);
    expect(canLogin(offboarded)).toBe(false);
    expect(canLogin({ ...onboarded, isActive: false })).toBe(false);
  });
  it('akun seeder tidak butuh data member', () => {
    expect(canLogin(system)).toBe(true);
  });
});

describe('akses komite', () => {
  it('seeder selalu punya akses', () => {
    expect(canAccessCommittee(system, [], '2030-01-01')).toBe(true);
  });
  it('member butuh posisi pemberi akses yang berlaku', () => {
    expect(canAccessCommittee(onboarded, [president], '2025-07-15')).toBe(true);
    expect(canAccessCommittee(onboarded, [president], '2025-08-01')).toBe(false);
  });
  it('posisi biasa tidak memberi akses', () => {
    expect(canAccessCommittee(onboarded, [{ ...president, grantsCommittee: false }], '2025-07-15')).toBe(false);
  });
  it('offboarded kehilangan akses walau masih dalam masa jabatan', () => {
    expect(canAccessCommittee(offboarded, [president], '2025-07-15')).toBe(false);
  });
});
