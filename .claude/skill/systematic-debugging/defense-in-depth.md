# Defense-in-Depth Validation

## Overview

When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed by different code paths, refactoring, or mocks.

**Core principle:** Validate at EVERY layer data passes through. Make the bug structurally impossible.

## Why Multiple Layers

Single validation: "We fixed the bug"
Multiple layers: "We made the bug impossible"

Different layers catch different cases:

- Entry validation catches most bugs
- Business logic catches edge cases
- Environment guards prevent context-specific dangers
- Debug logging helps when other layers fail

## The Four Layers

### Layer 1: Entry Point Validation

**Purpose:** Reject obviously invalid input at API boundary

```javascript
// JavaScript
function createProject(name, workingDirectory) {
  if (!workingDirectory?.trim()) throw new Error("workingDirectory cannot be empty");
  if (!existsSync(workingDirectory)) throw new Error(`workingDirectory does not exist`);
  // ... proceed
}
```

```php
// PHP
public function createProject(string $name, string $workingDirectory): void {
    if (empty(trim($workingDirectory))) throw new InvalidArgumentException("workingDirectory cannot be empty");
    if (!is_dir($workingDirectory)) throw new InvalidArgumentException("workingDirectory does not exist");
    // ... proceed
}
```

```python
# Python
def create_project(name: str, working_directory: str) -> None:
    if not working_directory or not working_directory.strip():
        raise ValueError("working_directory cannot be empty")
    if not os.path.isdir(working_directory):
        raise ValueError("working_directory does not exist")
    # ... proceed
```

### Layer 2: Business Logic Validation

**Purpose:** Ensure data makes sense for this operation

```javascript
// JavaScript
function initializeWorkspace(projectDir, sessionId) {
  if (!projectDir) throw new Error("projectDir required for workspace initialization");
  // ... proceed
}
```

```php
// PHP
public function initializeWorkspace(string $projectDir, string $sessionId): void {
    if (empty($projectDir)) throw new DomainException("projectDir required for workspace initialization");
    // ... proceed
}
```

```python
# Python
def initialize_workspace(project_dir: str, session_id: str) -> None:
    if not project_dir:
        raise ValueError("project_dir required for workspace initialization")
    # ... proceed
```

### Layer 3: Environment Guards

**Purpose:** Prevent dangerous operations in specific contexts

```javascript
// JavaScript
async function gitInit(directory) {
  if (process.env.NODE_ENV === "test") {
    const normalized = path.resolve(directory);
    if (!normalized.startsWith(os.tmpdir())) {
      throw new Error(`Refusing git init outside temp dir during tests: ${directory}`);
    }
  }
  // ... proceed
}
```

```php
// PHP
public function gitInit(string $directory): void {
    if (app()->environment('testing')) {
        if (!str_starts_with(realpath($directory), sys_get_temp_dir())) {
            throw new RuntimeException("Refusing git init outside temp dir during tests: {$directory}");
        }
    }
    // ... proceed
}
```

```python
# Python
def git_init(directory: str) -> None:
    if os.environ.get("TESTING"):
        if not os.path.realpath(directory).startswith(tempfile.gettempdir()):
            raise RuntimeError(f"Refusing git init outside temp dir during tests: {directory}")
    # ... proceed
```

### Layer 4: Debug Instrumentation

**Purpose:** Capture context for forensics

```javascript
// JavaScript
async function gitInit(directory) {
  console.error("DEBUG git init:", { directory, cwd: process.cwd(), stack: new Error().stack });
  // ... proceed
}
```

```php
// PHP
public function gitInit(string $directory): void {
    Log::debug("About to git init", ['directory' => $directory, 'cwd' => getcwd(), 'trace' => debug_backtrace()]);
    // ... proceed
}
```

```python
# Python
def git_init(directory: str) -> None:
    import traceback
    logging.debug(f"About to git init: dir={directory}, cwd={os.getcwd()}, trace={traceback.format_stack()}")
    # ... proceed
```

## Applying the Pattern

When you find a bug:

1. **Trace the data flow** - Where does bad value originate? Where used?
2. **Map all checkpoints** - List every point data passes through
3. **Add validation at each layer** - Entry, business, environment, debug
4. **Test each layer** - Try to bypass layer 1, verify layer 2 catches it

## Example from Session

Bug: Empty `projectDir` caused `git init` in source code

**Data flow:**

1. Test setup → empty string
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` runs in `process.cwd()`

**Four layers added:**

- Layer 1: `Project.create()` validates not empty/exists/writable
- Layer 2: `WorkspaceManager` validates projectDir not empty
- Layer 3: `WorktreeManager` refuses git init outside tmpdir in tests
- Layer 4: Stack trace logging before git init

**Result:** All 1847 tests passed, bug impossible to reproduce

## Key Insight

All four layers were necessary. During testing, each layer caught bugs the others missed:

- Different code paths bypassed entry validation
- Mocks bypassed business logic checks
- Edge cases on different platforms needed environment guards
- Debug logging identified structural misuse

**Don't stop at one validation point.** Add checks at every layer.
