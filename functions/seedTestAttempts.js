//functions/seedTestAttempts.js
import admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Config
const NUM_USERS = 500; // Total fake users
const TEST_ID = "t1"; // Example test ID
const GROUP_ID = "abc123"; // Example group ID

function randomScore(max = 10) {
  return Math.floor(Math.random() * (max + 1));
}

function randomTime(maxSeconds = 300) {
  return Math.floor(Math.random() * maxSeconds);
}

function randomDate() {
  const start = new Date(2025, 7, 1).getTime(); // Aug 1, 2025
  const end = new Date(2025, 7, 14).getTime(); // Aug 14, 2025
  return new Date(start + Math.random() * (end - start));
}

async function seed() {
  console.log(`Seeding ${NUM_USERS} test_attempts...`);

  for (let i = 1; i <= NUM_USERS; i++) {
    const userId = `user${i.toString().padStart(3, "0")}`;
    const score = randomScore(10);
    const remainingTime = randomTime(300); // seconds
    const finishedAt = randomDate();

    const docRef = db.collection("test_attempts").doc();
    await docRef.set({
      userId,
      name: `Player ${i}`,
      testId: TEST_ID,
      groupId: GROUP_ID,
      score,
      remainingTime,
      finishedAt,
      startedAt: new Date(finishedAt.getTime() - (300 - remainingTime) * 1000),
    });
  }

  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
