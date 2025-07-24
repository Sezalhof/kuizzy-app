import React from "react";
import { PhoneCall, MessageSquare, ClipboardCopy } from "lucide-react";

export default function StudentContactButtons({ student, copiedId, onCopy }) {
  const uid = student.uid || student.id;
  const phoneNumber = student.phone?.replace(/\D/g, "");

  const handleCall = () => {
    const isMobile = /iPhone|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(`tel:${student.phone}`, "_self");
    } else {
      alert("Phone call is only supported on mobile devices.");
    }
  };

  return (
    <div className="flex gap-3 items-center">
      {student.phone && (
        <>
          <button
            onClick={handleCall}
            className="text-green-600 hover:text-green-800"
            title="Call phone"
          >
            <PhoneCall className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              window.open(`https://wa.me/${phoneNumber}`, "_blank")
            }
            className="text-green-700 hover:text-green-900"
            title="Send WhatsApp message"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCopy(student.phone, uid + "-phone")}
            className="text-gray-600 hover:text-gray-800"
            title="Copy number"
          >
            <ClipboardCopy className="w-4 h-4" />
          </button>
          {copiedId === uid + "-phone" && (
            <span className="text-xs text-green-500">Copied!</span>
          )}
        </>
      )}
    </div>
  );
}
