import React, { useState, useEffect, useRef } from "react";
import useAuth from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import { updateUserProfile } from "../../utils/firestoreUtils";
import { uploadImage, getDefaultAvatars } from "../../utils/uploadUtils";
import LoadingSpinner from "../../components/LoadingSpinner";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import Slider from "@mui/material/Slider";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";

const StudentDashboard = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", avatar: "" });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [defaultAvatars, setDefaultAvatars] = useState([]);
  const inputRef = useRef(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppingImage, setCroppingImage] = useState(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  useEffect(() => {
    setDefaultAvatars(getDefaultAvatars());
  }, []);

  if (profileLoading || !profile) return <LoadingSpinner />;

  const handleEditClick = () => {
    setFormData({
      name: profile.name || "",
      avatar: profile.avatar || "",
    });
    setAvatarPreview(profile.avatar || "");
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setCroppingImage(reader.result);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const cropImage = async () => {
    try {
      const croppedImage = await getCroppedImg(croppingImage, croppedAreaPixels);
      const file = await dataURLtoFile(croppedImage, "cropped_avatar.webp");

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.05,
        maxWidthOrHeight: 256,
        useWebWorker: true,
        fileType: "image/webp",
      });

      setUploading(true);
      const avatarUrl = await uploadImage(user.uid, compressedFile);
      setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
      setAvatarPreview(URL.createObjectURL(compressedFile));
      setCropDialogOpen(false);
    } catch (error) {
      alert("Image crop/upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const getCroppedImg = (imageSrc, pixelCrop) => {
    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = imageSrc;

    return new Promise((resolve) => {
      image.onload = () => {
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );
        resolve(canvas.toDataURL("image/webp"));
      };
    });
  };

  const dataURLtoFile = (dataUrl, filename) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleDefaultAvatarClick = (url) => {
    setFormData((prev) => ({ ...prev, avatar: url }));
    setAvatarPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(user.uid, {
        name: formData.name,
        avatar: formData.avatar,
      });
      setIsEditing(false);
    } catch (error) {
      alert("Failed to update profile.");
    }
  };

  // ARIA fix: close dialog and return focus to "Select Image" button
  const handleCropDialogClose = () => {
    setCropDialogOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>

      {!isEditing ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center space-x-4">
            <img
              src={profile.avatar || "/default-avatar.png"}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border"
            />
            <div>
              <h2 className="text-xl font-semibold">{profile.name}</h2>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-600">Class: {profile.class}</p>
              <p className="text-sm text-gray-600">School: {profile.school_name}</p>
            </div>
          </div>
          <button
            onClick={handleEditClick}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Profile
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <img
              src={avatarPreview || "/default-avatar.png"}
              alt="Avatar Preview"
              className="w-24 h-24 rounded-full object-cover border"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Profile Picture:
              </label>
              <button
                type="button"
                onClick={() => inputRef.current.click()}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Select Image
              </button>
              <input
                type="file"
                accept="image/*"
                ref={inputRef}
                onChange={handleFileChange}
                hidden
              />
              {uploading && <p className="text-xs text-gray-500">Uploading...</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or select a default avatar:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {defaultAvatars.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Avatar ${idx + 1}`}
                  onClick={() => handleDefaultAvatarClick(url)}
                  className={`w-16 h-16 rounded-full cursor-pointer border-2 ${
                    avatarPreview === url ? "border-blue-500" : "border-transparent"
                  } hover:border-blue-400`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 w-full border rounded p-2"
              required
            />
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={uploading}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <Dialog open={cropDialogOpen} onClose={handleCropDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Crop Image</DialogTitle>
        <DialogContent>
          <div className="relative w-full h-64 bg-gray-200">
            <Cropper
              image={croppingImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(e, zoom) => setZoom(zoom)}
            className="mt-4"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCropDialogClose}>Cancel</Button>
          <Button onClick={cropImage} variant="contained" color="primary" disabled={uploading}>
            Crop & Upload
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;
