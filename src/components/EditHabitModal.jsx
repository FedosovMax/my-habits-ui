import React, { useEffect, useState } from "react";

export default function EditHabitModal({ isOpen, habit, onSave, onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (habit) {
      setName(habit.name ?? "");
      setDescription(habit.description ?? "");
    }
  }, [habit]);

  if (!isOpen || !habit) return null;

  const handleSave = () => {
    onSave({
      ...habit,
      name: name.trim(),
      description: description.trim(),
    });
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={stop}>
        <h3>Edit habit</h3>

        <label className="field">
          <span>Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Habit name"
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={4}
          />
        </label>

        <div className="actions">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
