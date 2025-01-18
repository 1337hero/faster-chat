import React from "react";

interface InputAreaProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
}

function InputArea({ input, handleInputChange, handleSubmit, disabled }: InputAreaProps) {
  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
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