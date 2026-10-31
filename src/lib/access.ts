/** Aturan akses murni, tanpa database, agar mudah diuji. Lihat PRD bagian 3. */

export type AccessAccount = {
  kind: 'system' | 'member';
  isActive: boolean;
  memberStatus: 'onboarded' | 'offboarded' | null;
};

export type AccessPosition = {
  grantsCommittee: boolean;
  startDate: string;
  endDate: string | null;
};

/** Tanggal hari ini (YYYY-MM-DD) menurut WIB. */
export function todayInJakarta(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

export function isPositionActive(position: Pick<AccessPosition, 'startDate' | 'endDate'>, today: string): boolean {
  return position.startDate <= today && (position.endDate === null || position.endDate >= today);
}

export function canLogin(account: AccessAccount): boolean {
  if (!account.isActive) return false;
  return account.kind === 'system' || account.memberStatus === 'onboarded';
}

export function canAccessCommittee(account: AccessAccount, memberPositions: AccessPosition[], today: string): boolean {
  if (!canLogin(account)) return false;
  if (account.kind === 'system') return true;
  return memberPositions.some((p) => p.grantsCommittee && isPositionActive(p, today));
}
