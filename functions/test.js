import functions from "firebase-functions";

export const testFunction = functions.https.onRequest((req, res) => {
  res.send("Test function OK");
});
