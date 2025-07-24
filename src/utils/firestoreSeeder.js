// src/utils/firestoreSeeder.js
import { db } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import gobindaganjData from "../data/locations/rangpur/gaibandha/gobindaganjData";

export const seedLocationData = async () => {
  const { division, district, upazila, unions, pouroshavas, schools } = gobindaganjData;

  const divisionRef = doc(db, "divisions", division.id);
  await setDoc(divisionRef, { name: division.name });

  const districtRef = doc(divisionRef, "districts", district.id);
  await setDoc(districtRef, { name: district.name });

  const upazilaRef = doc(districtRef, "upazilas", upazila.id);
  await setDoc(upazilaRef, { name: upazila.name });

  for (const union of unions) {
    const unionRef = doc(upazilaRef, "unions", union.id);
    await setDoc(unionRef, { name: union.name });
  }

  for (const pouro of pouroshavas) {
    const pouroRef = doc(upazilaRef, "pouroshavas", pouro.id);
    await setDoc(pouroRef, { name: pouro.name });
  }

  for (const school of schools) {
    const schoolRef = doc(upazilaRef, "schools", school.id);
    await setDoc(schoolRef, {
      name: school.name,
      unionId: school.unionId
    });
  }

  console.log("✅ Gobindaganj data seeded successfully!");
};
