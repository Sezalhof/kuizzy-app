// src/components/friends/AddFriendForm.js
import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast'; // ✅ This one stays same


const AddFriendForm = ({ sendRequest }) => {
  const [code, setCode] = useState("");

  const submit = async () => {
    try {
      await sendRequest(code);
      toast.success("Request sent!");
      setCode("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex gap-2">
      <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Phone with country code" />
      <Button onClick={submit}>Send</Button>
    </div>
  );
};

export default AddFriendForm;
