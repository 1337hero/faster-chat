import { Check, ChevronLeft, ChevronRight, GitBranch } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";

/**
 * Branch navigation UI showing current branch and allowing switching between branches
 * @param {object} props
 * @param {string} props.chatId - The chat ID
 * @param {string} props.messageId - The parent message ID
 * @param {array} props.branches - Array of branch objects
 * @param {number} props.currentBranchIndex - Current active branch index
 * @param {function} props.onBranchChange - Callback when user switches branch (branchId) => void
 */
export function BranchNavigator({
  chatId,
  messageId,
  branches = [],
  currentBranchIndex = 0,
  onBranchChange,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!branches || branches.length <= 1) {
    return null; // Don't show if there's only one branch
  }

  const currentBranch = branches[currentBranchIndex];
  const totalBranches = branches.length;

  const handlePrevious = () => {
    if (currentBranchIndex > 0) {
      const prevBranch = branches[currentBranchIndex - 1];
      onBranchChange(prevBranch.id);
    }
  };

  const handleNext = () => {
    if (currentBranchIndex < totalBranches - 1) {
      const nextBranch = branches[currentBranchIndex + 1];
      onBranchChange(nextBranch.id);
    }
  };

  const handleSelectBranch = (branch) => {
    onBranchChange(branch.id);
    setIsExpanded(false);
  };

  return (
    <div className="relative my-2">
      {/* Compact Navigator */}
      <div className="bg-theme-surface border-theme-border/50 flex items-center gap-2 rounded-lg border p-2 shadow-sm">
        <div className="bg-theme-mauve/20 flex h-6 w-6 items-center justify-center rounded">
          <GitBranch className="text-theme-mauve h-3.5 w-3.5" />
        </div>

        <button
          onClick={handlePrevious}
          disabled={currentBranchIndex === 0}
          className="text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous branch">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-theme-text hover:bg-theme-surface-strong flex min-w-[120px] items-center justify-center gap-1.5 rounded px-3 py-1 text-sm font-medium transition-colors">
          <span>
            Branch {currentBranchIndex + 1} of {totalBranches}
          </span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentBranchIndex === totalBranches - 1}
          className="text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next branch">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded Branch List */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
            aria-label="Close branch list"
          />

          {/* Branch List Dropdown */}
          <div className="bg-theme-surface border-theme-border absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border shadow-lg">
            {branches.map((branch, index) => (
              <button
                key={branch.id}
                onClick={() => handleSelectBranch(branch)}
                className={`hover:bg-theme-surface-strong border-theme-border/30 flex w-full items-start gap-3 border-b p-3 text-left transition-colors last:border-b-0 ${
                  branch.isActive ? "bg-theme-surface-strong/50" : ""
                }`}>
                <div className="bg-theme-mauve/20 text-theme-mauve flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-theme-text text-sm font-medium">Branch {index + 1}</span>
                    {branch.isActive && (
                      <div className="bg-theme-blue/20 flex items-center gap-1 rounded-full px-2 py-0.5">
                        <Check className="text-theme-blue h-3 w-3" />
                        <span className="text-theme-blue text-xs font-medium">Active</span>
                      </div>
                    )}
                  </div>

                  <p className="text-theme-text-muted line-clamp-2 text-xs leading-relaxed">
                    {branch.content.substring(0, 150)}
                    {branch.content.length > 150 ? "..." : ""}
                  </p>

                  <p className="text-theme-text-muted mt-1 text-xs">
                    {new Date(branch.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
