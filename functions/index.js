// index.js (ESM style with "type": "module" in package.json)
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Define your routes
app.get("/api/mockSchools", (req, res) => {
  res.json({
    success: true,
    data: [
      { id: "school_001", name: "Tejgaon Government High School" },
      { id: "school_002", name: "Motijheel Ideal School & College" },
    ],
  });
});

// Export the function properly (no manual app.listen!)
export const api = onRequest(app);
