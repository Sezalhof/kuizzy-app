// src/components/admin/PageSizeSelector.js
import React from "react";

export default function PageSizeSelector({ pageSize, setPageSize }) {
  return (
    <div className="mt-2">
      <label htmlFor="pageSize" className="mr-2 font-medium">
        Students per page:
      </label>
      <select
        id="pageSize"
        className="border rounded p-1"
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
      >
        {[5, 10, 20, 50].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
