// src/components/AvatarUploader.js
import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { processImage, uploadImage } from "../utils/uploadUtils";

export default function AvatarUploader() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [error, setError] = useState(null);

  if (!user) {
    return <p>Please log in to upload your avatar.</p>;
  }

  // When user selects a file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl("");
    setError(null);
  };

  // Upload button clicked
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image file first.");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // Process image (crop to square and resize max 300px)
      const processedBlob = await processImage(selectedFile, 300, true);

      // Upload image to Firebase Storage
      const downloadUrl = await uploadImage(user.uid, processedBlob, "avatar.webp");

      setUploadedUrl(downloadUrl);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "20px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Upload Your Avatar</h2>

      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />

      {previewUrl && (
        <div style={{ marginTop: 10 }}>
          <p>Preview:</p>
          <img src={previewUrl} alt="Preview" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "50%", border: "1px solid #ddd" }} />
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !selectedFile}
        style={{
          marginTop: 15,
          padding: "8px 16px",
          backgroundColor: uploading || !selectedFile ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
        }}
      >
        {uploading ? "Uploading..." : "Crop & Upload"}
      </button>

      {uploadedUrl && (
        <div style={{ marginTop: 15 }}>
          <p>Upload successful! Your avatar:</p>
          <img src={uploadedUrl} alt="Uploaded Avatar" style={{ width: 120, height: 120, borderRadius: "50%", border: "1px solid #ddd" }} />
        </div>
      )}

      {error && (
        <p style={{ marginTop: 10, color: "red" }}>
          {error}
        </p>
      )}
    </div>
  );
}
