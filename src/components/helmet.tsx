/** Helmet Argos sebagai SVG agar tiap bilah bisa dianimasikan. Bentuknya mengikuti logo resmi. */
const BLADES = [
  '45,1103 266,1122 227,1191 277,1281 155,1294',
  '177,809 394,901 318,1033 77,983',
  '333,541 512,696 439,824 236,707',
  '509,235 646,464 560,614 395,432',
  '592,94 831,94 913,449 751,449',
  '966,94 1182,94 1150,449 1004,449',
  '1317,94 1554,94 1402,449 1241,449',
  '1719,94 1849,318 1601,602 1513,450',
];
const LOWER = ['212,1395 328,1369 403,1498 300,1546', '351,1635 448,1577 522,1704 436,1781'];
const BODY =
  '711,547 1456,547 1656,892 1643,941 1888,1365 1690,1300 1517,1000 1057,1000 1160,1179 1443,1179 1633,1508 1443,1837 1062,1837 841,1453 738,1632 856,1837 711,1837 338,1192';
const VISOR = '1145,1051 1487,1051 1531,1127 1189,1127';

export function Helmet({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  const blade = (index: number) =>
    animated ? { className: 'blade', style: { animationDelay: `${index * 70}ms` } } : {};
  return (
    <svg viewBox="0 0 1932 1932" aria-hidden className={className} fill="currentColor">
      {LOWER.map((points, i) => <polygon key={points} points={points} {...blade(i)} />)}
      {BLADES.map((points, i) => <polygon key={points} points={points} {...blade(i + 2)} />)}
      <polygon points={BODY} {...blade(10)} />
      <polygon points={VISOR} {...blade(12)} />
    </svg>
  );
}
