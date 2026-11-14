/** Sum the full date's digits; preserve 11 or 22 after any complete reduction. */
export function birthNumber(input: string): {
  number: number;
  steps: number[];
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) throw new Error('生年月日を入力してください。');
  const [, y, m, d] = match;
  const year = Number(y),
    month = Number(m),
    day = Number(d);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (
    year < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error('実在する生年月日を入力してください。');
  let sum = [...y, ...m, ...d].reduce(
    (total, digit) => total + Number(digit),
    0,
  );
  const steps = [sum];
  while (sum > 9 && sum !== 11 && sum !== 22) {
    sum = String(sum)
      .split('')
      .reduce((total, digit) => total + Number(digit), 0);
    steps.push(sum);
  }
  return { number: sum, steps };
}
