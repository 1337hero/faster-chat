import { ModelRegistry } from '@/lib/constants/models';
import React from 'react';

interface ModelSelectorProps {
  currentModel: keyof typeof ModelRegistry;
  onModelChange: (model: keyof typeof ModelRegistry) => void;
}

function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  return (
    <div className="mb-4">
      <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
        Model
      </label>
      <select
        id="model-select"
        value={currentModel}
        onChange={(e) => onModelChange(e.target.value as keyof typeof ModelRegistry)}
        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {Object.entries(ModelRegistry).map(([modelId, model]) => (
          <option key={modelId} value={modelId}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ModelSelector;
