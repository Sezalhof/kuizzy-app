const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

exports.seedGeoData = onRequest(async (req, res) => {
  try {
    const batch = db.batch();

    const divisionRef = db.collection("divisions").doc("rangpur");
    batch.set(divisionRef, { name: "Rangpur" });

    const districtRef = db.collection("districts").doc("gaibandha");
    batch.set(districtRef, { name: "Gaibandha", divisionId: "rangpur" });

    const upazilaRef = db.collection("upazilas").doc("gobindaganj");
    batch.set(upazilaRef, {
      name: "Gobindaganj",
      districtId: "gaibandha",
      divisionId: "rangpur",
    });

    const unionRef = db.collection("unions").doc("shibpur");
    batch.set(unionRef, {
      name: "Shibpur",
      upazilaId: "gobindaganj",
      districtId: "gaibandha",
      divisionId: "rangpur",
    });

    const pouroRef = db.collection("pouroshavas").doc("gobindaganjPouroshava");
    batch.set(pouroRef, {
      name: "Gobindaganj Pouroshava",
      upazilaId: "gobindaganj",
      districtId: "gaibandha",
      divisionId: "rangpur",
    });

    const school1Ref = db.collection("schools").doc("shibpurHigh");
    batch.set(school1Ref, {
      name: "Shibpur High School",
      unionId: "shibpur",
      upazilaId: "gobindaganj",
      districtId: "gaibandha",
      divisionId: "rangpur",
    });

    const school2Ref = db.collection("schools").doc("gobindaganjGovt");
    batch.set(school2Ref, {
      name: "Gobindaganj Govt High School",
      pouroshavaId: "gobindaganjPouroshava",
      upazilaId: "gobindaganj",
      districtId: "gaibandha",
      divisionId: "rangpur",
    });

    await batch.commit();
    res.status(200).send("✅ Geo data seeded successfully.");
  } catch (error) {
    console.error("🔥 Seeding error:", error);
    res.status(500).send("❌ Failed to seed geo data.");
  }
});
