// ✅ FILE: src/components/ui/LoadingSpinner.js

import React from "react";

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-solid" />
    </div>
  );
}
