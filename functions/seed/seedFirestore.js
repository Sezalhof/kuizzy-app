const admin = require("firebase-admin");
const adminData = require("./adminData");

admin.initializeApp();

const db = admin.firestore();

async function seedData() {
  console.log("🌱 Starting Firestore seeding...");

  // Seed Divisions
  for (const division of adminData.divisions) {
    const divisionRef = db.collection("divisions").doc(division.id);
    await divisionRef.set({ name: division.name });

    for (const district of division.districts) {
      const districtRef = divisionRef.collection("districts").doc(district.id);
      await districtRef.set({ name: district.name });

      for (const upazila of district.upazilas) {
        const upazilaRef = districtRef.collection("upazilas").doc(upazila.id);
        await upazilaRef.set({ name: upazila.name });

        for (const unionName of upazila.unions) {
          await upazilaRef.collection("unions").add({ name: unionName });
        }
      }
    }
  }

  // Seed Pouroshavas
  for (const p of adminData.pouroshavas) {
    await db.collection("pouroshavas").doc(p.id).set({
      name: p.name,
      upazilaId: p.upazilaId
    });
  }

  // Seed School Categories
  for (const cat of adminData.schoolCategories) {
    await db.collection("school_categories").doc(cat.id).set({
      name: cat.name
    });
  }

  console.log("✅ Firestore seeding completed.");
}

seedData().catch(console.error);
