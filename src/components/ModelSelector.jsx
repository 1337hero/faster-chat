import React from 'react';
import { ModelRegistry, ProviderType } from '../services/providers/provider-registry';

function ModelSelector({ currentModel, onModelChange }) {
  const models = ModelRegistry[ProviderType.ANTHROPIC];

  return (
    <div className="mb-4">
      <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
        Model
      </label>
      <select
        id="model-select"
        value={currentModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {Object.entries(models).map(([modelId, model]) => (
          <option key={modelId} value={modelId}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ModelSelector;