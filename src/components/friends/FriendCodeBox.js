import React from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Copy, Share2 } from "lucide-react";
import { toast } from "react-toastify";

/**
 * Displays a read-only input showing user's code (phone/email/uid) with copy/share buttons.
 * Useful for allowing others to add the user via code.
 */
const FriendCodeBox = ({ uid, phone, email }) => {
  const code = phone || email || uid;

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("✅ Friend code copied!");
    } else {
      toast.error("⚠️ No friend code available.");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Kuizzy Friend Code",
          text: `Here's my Kuizzy friend code: ${code}`,
        });
      } else {
        toast.info("Sharing not supported on this browser.");
      }
    } catch (err) {
      toast.error("❌ Share failed.");
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm text-gray-600">Your Friend Code:</label>
      <div className="flex items-center gap-2">
        <Input readOnly value={code} className="w-full text-sm" />
        <Button size="icon" variant="outline" onClick={handleCopy}>
          <Copy className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default FriendCodeBox;
