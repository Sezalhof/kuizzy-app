// src/utils/dateUtils.js
export function getTwoMonthPeriod() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
  
    // Determine two-month period label, e.g., "2025-JulAug"
    const periodMap = [
      "JanFeb", "MarApr", "MayJun", "JulAug", "SepOct", "NovDec"
    ];
    const periodIndex = Math.floor(month / 2); // 0-5
    const periodLabel = periodMap[periodIndex] || "Unknown";
  
    return `${year}-${periodLabel}`;
  }
  