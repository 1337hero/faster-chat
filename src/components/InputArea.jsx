import React, { useState } from "react";

function InputArea({ onSendMessage, disabled }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input);
      setInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
          disabled={disabled}
        />
        <button
          type="submit"
          className={`px-4 py-2 rounded-r-lg ${
            disabled
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
          disabled={disabled}
        >
          {disabled ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}

export default InputArea;