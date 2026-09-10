import "server-only";
import { randomInt } from "node:crypto";

function checkDigit(sixDigits: string) {
  let sum = 0;
  for (let index = 0; index < sixDigits.length; index += 1) {
    let value = Number(sixDigits[sixDigits.length - 1 - index]);
    if (index % 2 === 0) { value *= 2; if (value > 9) value -= 9; }
    sum += value;
  }
  return String((10 - (sum % 10)) % 10);
}

export function createNumericCode() {
  const base = String(randomInt(100000, 1000000));
  return `${base}${checkDigit(base)}`;
}
