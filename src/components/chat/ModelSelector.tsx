"use client";
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from "@/components/ui/dropdown";
import { ModelRegistry } from "@/lib/constants/models";
import { ModelId } from "@/types/models";
import React from "react";

interface ModelSelectorProps {
  currentModel: ModelId;
  onModelChange: (model: ModelId) => void;
}

function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  const modelConfig = ModelRegistry[currentModel] || ModelRegistry["claude-3-5-sonnet-20241022"];

  return (
    <div className="px-4">
      <div className="flex items-center justify-between bg-macchiato-surface0 pr-2">
        <Dropdown>
          <DropdownButton>
            <span>{modelConfig.name}</span>
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </DropdownButton>
          <DropdownMenu>
            {(Object.entries(ModelRegistry) as [ModelId, typeof ModelRegistry[ModelId]][]).map(([modelId, model]) => (
              <DropdownItem
                key={modelId}
                onClick={() => onModelChange(modelId)}>
                {model.name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
}

export default ModelSelector;
