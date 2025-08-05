// functions/routes/mockRoutes.js
const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const locationsData = require("../data/locations");

// Step 1: Extract schools with location info
function getFlattenedSchools() {
  const schools = [];

  locationsData.divisions.forEach((division) => {
    division.districts.forEach((district) => {
      district.upazilas.forEach((upazila) => {
        if (upazila.schools && upazila.schools.length > 0) {
          upazila.schools.forEach((school) => {
            schools.push({
              ...school,
              division: division.name,
              district: district.name,
              upazila: upazila.name
            });
          });
        }
      });
    });
  });

  return schools;
}

// Route 1: Return all mock schools
router.get("/mockSchools", (req, res) => {
  const schools = getFlattenedSchools();
  res.json({ success: true, data: schools });
});

// Route 2: Upload mock schools to Firestore
router.get("/registerMockSchools", async (req, res) => {
  const db = admin.firestore();
  const batch = db.batch();
  const schools = getFlattenedSchools();

  try {
    schools.forEach((school) => {
      const ref = db.collection("schools").doc(school.id);
      batch.set(ref, school, { merge: true });
    });

    await batch.commit();
    res.json({ success: true, message: "Mock schools registered in Firestore." });
  } catch (error) {
    console.error("Error registering mock schools:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
