// importTests.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin SDK (requires GOOGLE_APPLICATION_CREDENTIALS env var)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

const TESTS_DIR = path.join(__dirname, "..", "src", "data", "tests");

async function importAllTests() {
  const batch = db.batch();
  let importedCount = 0;

  function readJsonFiles(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subfolders (e.g., grade folders)
        readJsonFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          const jsonData = JSON.parse(fs.readFileSync(fullPath, "utf8"));

          // Extract grade & subject from folder structure
          const relativePath = path.relative(TESTS_DIR, fullPath);
          const [grade, subjectFile] = relativePath.split(path.sep);
          const subject = subjectFile.replace(".json", "");

          jsonData.forEach((test) => {
            const docId = test.id || `${grade}-${subject}-${Date.now()}`;
            const docRef = db.collection("tests").doc(docId);

            batch.set(docRef, {
              ...test,
              grade,
              subject,
            });
            importedCount++;
          });
        } catch (err) {
          console.error(`Failed to parse JSON in ${fullPath}:`, err);
        }
      }
    });
  }

  readJsonFiles(TESTS_DIR);
  await batch.commit();
  console.log(`✅ Imported ${importedCount} tests from ${TESTS_DIR}`);
}

importAllTests()
  .then(() => {
    console.log("📥 Import completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Import failed:", err);
    process.exit(1);
  });
