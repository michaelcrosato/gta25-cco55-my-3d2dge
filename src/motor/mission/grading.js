// A pass's medal (PLAN.md 8.15): bronze for the job done, silver with half its bonus objectives met (rounded up),
// gold with all of them and no retry; a mission with no bonus objectives: gold without a retry, else silver.
//   grade([{ id, ok }...], retries) -> 'bronze' | 'silver' | 'gold'
export function grade(bonus, retries = 0) {
  const n = bonus.length, met = bonus.filter(b => b.ok).length;
  if (!n) return retries ? 'silver' : 'gold';
  if (met === n && !retries) return 'gold';
  return met >= Math.ceil(n / 2) ? 'silver' : 'bronze';
}
