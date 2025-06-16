import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import {db} from './config/firebase'

const TaskAdder = () => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setStatus("Naam mag niet leeg zijn.");
      return;
    }

    try {
      await addDoc(collection(db, "task"), {
        name: name.trim(),
      });
      setStatus("Taak succesvol toegevoegd!");
      setName(""); // Reset form
    } catch (error) {
      setStatus("Fout bij toevoegen: " + error.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-2">Nieuwe Taak Toevoegen</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Naam van de taak"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Toevoegen
        </button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </form>
    </div>
  );
};

export default TaskAdder;
