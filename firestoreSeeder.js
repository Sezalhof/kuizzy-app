// FILE: firestoreSeeder.js

const admin = require("firebase-admin");
const fs = require("fs");

// Load service account
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seedGobindaganjData() {
  const division = {
    id: "rangpur",
    name: "Rangpur",
  };

  const district = {
    id: "gaibandha",
    name: "Gaibandha",
    divisionId: "rangpur",
  };

  const upazila = {
    id: "gobindaganj",
    name: "Gobindaganj",
    districtId: "gaibandha",
    divisionId: "rangpur",
  };

  const unions = [
    { id: "kamdia", name: "Kamdia" },
    { id: "mahimaganj", name: "Mahimaganj" },
    { id: "shibpur", name: "Shibpur" },
  ];

  const pouroshavas = [
    { id: "gobindaganjPouroshava", name: "Gobindaganj Pouroshava" },
  ];

  const schools = [
    {
      id: "shibpurHigh",
      name: "Shibpur High School",
      upazilaId: "gobindaganj",
      unionId: "shibpur",
      districtId: "gaibandha",
      divisionId: "rangpur",
    },
    {
      id: "gobindaganjGovt",
      name: "Gobindaganj Govt High School",
      upazilaId: "gobindaganj",
      pouroshavaId: "gobindaganjPouroshava",
      districtId: "gaibandha",
      divisionId: "rangpur",
    },
  ];

  try {
    await db.collection("divisions").doc(division.id).set(division);
    await db.collection("districts").doc(district.id).set(district);
    await db.collection("upazilas").doc(upazila.id).set(upazila);

    for (const union of unions) {
      await db.collection("unions").doc(union.id).set({
        ...union,
        upazilaId: upazila.id,
        districtId: district.id,
        divisionId: division.id,
      });
    }

    for (const pouroshava of pouroshavas) {
      await db.collection("pouroshavas").doc(pouroshava.id).set({
        ...pouroshava,
        upazilaId: upazila.id,
        districtId: district.id,
        divisionId: division.id,
      });
    }

    for (const school of schools) {
      await db.collection("schools").doc(school.id).set(school);
    }

    console.log("✅ Gobindaganj data seeded successfully to Firestore.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Firestore:", error);
    process.exit(1);
  }
}

seedGobindaganjData();
