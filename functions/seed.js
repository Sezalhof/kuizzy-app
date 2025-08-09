// seed.js
import { readFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

// 🔁 1. Corrected service account file name
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// 🔁 2. Firebase Admin Init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const seedSchools = async () => {
  try {
    const csvFilePath = path.resolve('./bd_locations.csv');
    const fileContent = await readFile(csvFilePath, 'utf8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    let addedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      const {
        Division,
        District,
        Upazila,
        Union,
        admin_type,
        school,
      } = record;

      const division = Division.trim();
      const district = District.trim();
      const upazila = Upazila.trim();
      const unionOrPouroshava = Union.trim();
      const schoolName = school.trim();

      const locationPath = [division, district, upazila, unionOrPouroshava]
        .filter(Boolean)
        .join(' > ');

      const schoolRef = db.collection('schools');
      const existing = await schoolRef
        .where('name', '==', schoolName)
        .where('location', '==', locationPath)
        .get();

      if (!existing.empty) {
        skippedCount++;
        continue;
      }

      const newSchool = {
        uid: uuidv4(),
        name: schoolName,
        location: locationPath,
        division,
        district,
        upazila,
        union_or_pouroshava: unionOrPouroshava,
        admin_type: admin_type.trim(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await schoolRef.add(newSchool);
      addedCount++;
    }

    console.log(`🎉 Seeding complete!`);
    console.log(`➕ Added: ${addedCount}`);
    console.log(`⏭️ Skipped (duplicates): ${skippedCount}`);
  } catch (error) {
    console.error('🔥 Error during seeding:', error);
  }
};

seedSchools();
