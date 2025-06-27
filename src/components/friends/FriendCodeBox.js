// src/components/friends/FriendCodeBox.js
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Copy, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";

const FriendCodeBox = ({ uid, phone }) => {
  const code = phone || uid;

  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="flex items-center gap-3">
      <Input readOnly value={code} className="w-full" />
      <Button size="icon" variant="outline" onClick={copy}><Copy /></Button>
      <Button size="icon" variant="outline"><Share2 /></Button>
    </div>
  );
};

export default FriendCodeBox;
