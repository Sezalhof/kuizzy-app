// src/utils/scoreUtils.js

/**
 * Filter and rank top scores for a group, prioritizing:
 * 1. Higher score
 * 2. Lower timeTaken
 * 3. More recent timestamp
 */
export function getTopScoresForGroup(scores = []) {
  const scoreMap = new Map();

  scores.forEach((entry) => {
    const existing = scoreMap.get(entry.userId);

    const currentScore = {
      ...entry,
      score: entry.value || entry.score || 0,
      timestamp: entry.timestamp?.toDate?.() || new Date(entry.timestamp)
    };

    if (!existing) {
      scoreMap.set(entry.userId, currentScore);
    } else {
      const isBetter =
        currentScore.score > existing.score ||
        (currentScore.score === existing.score && currentScore.timeTaken < existing.timeTaken) ||
        (currentScore.score === existing.score && currentScore.timeTaken === existing.timeTaken && currentScore.timestamp > existing.timestamp);

      if (isBetter) {
        scoreMap.set(entry.userId, currentScore);
      }
    }
  });

  const topScores = Array.from(scoreMap.values());

  topScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
    return b.timestamp - a.timestamp;
  });

  return topScores;
}
