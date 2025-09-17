import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/ui/dropdown';
import { ModelRegistry } from "@faster-chat/shared";

function ModelSelector({ currentModel, onModelChange }) {
  const modelConfig = ModelRegistry[currentModel] || ModelRegistry["claude-sonnet-4-5"];

  return (
    <div className="px-4">
      <div className="flex items-center justify-between bg-latte-surface0 dark:bg-macchiato-surface0 pr-2">
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
            {Object.entries(ModelRegistry).map(([modelId, model]) => (
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
