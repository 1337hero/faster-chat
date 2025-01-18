"use client";

import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from "@/components/ui/dropdown";
import { ModelRegistry } from "@/lib/constants/models";
import React from "react";

interface ModelSelectorProps {
  currentModel: keyof typeof ModelRegistry;
  onModelChange: (model: keyof typeof ModelRegistry) => void;
}

function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  return (
    <div className="mb-4 max-w-xs">
      <label className="mb-2 block text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Model
      </label>
      <Dropdown>
        <DropdownButton className="w-full justify-between">
          <span>{ModelRegistry[currentModel].name}</span>
          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </DropdownButton>
        <DropdownMenu>
          {Object.entries(ModelRegistry).map(([modelId, model]) => (
            <DropdownItem
              key={modelId}
              onClick={() => onModelChange(modelId as keyof typeof ModelRegistry)}>
              {model.name}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

export default ModelSelector;
