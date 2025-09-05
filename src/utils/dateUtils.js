// src/utils/dateUtils.js
export function getTwoMonthPeriod(inputDate) {
  const now = inputDate ? new Date(inputDate) : new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  const periodMap = ["JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"];
  const periodIndex = Math.floor(month / 2); // map to 0-5
  const periodLabel = periodMap[periodIndex] || "Unknown";

  return `${year}-${periodLabel}`;
}
