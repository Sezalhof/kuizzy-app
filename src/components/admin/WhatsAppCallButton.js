import React from "react";

export default function WhatsAppCallButton({ selectedStudents }) {
  const handleWhatsAppCall = () => {
    const phones = selectedStudents
      .map((s) => s.phone?.replace(/\D/g, ""))
      .filter(Boolean);

    if (phones.length === 0) {
      alert("Select students with valid phone numbers.");
      return;
    }

    const first = phones[0];
    const message = encodeURIComponent(
      "📞 Please initiate a WhatsApp voice call manually after this message."
    );

    window.open(`https://wa.me/${first}?text=${message}`, "_blank");
  };

  return (
    <button
      onClick={handleWhatsAppCall}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      📞 WhatsApp Call
    </button>
  );
}
