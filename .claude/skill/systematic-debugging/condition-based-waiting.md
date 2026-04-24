# Condition-Based Waiting

## Overview

Flaky tests often guess at timing with arbitrary delays. This creates race conditions where tests pass on fast machines but fail under load or in CI.

**Core principle:** Wait for the actual condition you care about, not a guess about how long it takes.

## When to Use

```dot
digraph when_to_use {
    "Test uses setTimeout/sleep?" [shape=diamond];
    "Testing timing behavior?" [shape=diamond];
    "Document WHY timeout needed" [shape=box];
    "Use condition-based waiting" [shape=box];

    "Test uses setTimeout/sleep?" -> "Testing timing behavior?" [label="yes"];
    "Testing timing behavior?" -> "Document WHY timeout needed" [label="yes"];
    "Testing timing behavior?" -> "Use condition-based waiting" [label="no"];
}
```

**Use when:**

- Tests have arbitrary delays (`setTimeout`, `sleep`, `time.sleep()`)
- Tests are flaky (pass sometimes, fail under load)
- Tests timeout when run in parallel
- Waiting for async operations to complete

**Don't use when:**

- Testing actual timing behavior (debounce, throttle intervals)
- Always document WHY if using arbitrary timeout

## Core Pattern

**❌ BEFORE: Guessing at timing**

```javascript
// JavaScript
await new Promise(r => setTimeout(r, 50));
```

```php
// PHP
usleep(50000);
```

```python
# Python
time.sleep(0.05)
```

**✅ AFTER: Waiting for condition**

```javascript
// JavaScript
await waitFor(() => getResult() !== undefined);
```

```php
// PHP (Laravel/PHPUnit)
$this->waitUntil(fn() => $this->getResult() !== null);
```

```python
# Python (pytest)
wait_for(lambda: get_result() is not None)
```

## Quick Patterns

| Scenario          | Pattern                                              |
| ----------------- | ---------------------------------------------------- |
| Wait for event    | `waitFor(() => events.find(e => e.type === 'DONE'))` |
| Wait for state    | `waitFor(() => machine.state === 'ready')`           |
| Wait for count    | `waitFor(() => items.length >= 5)`                   |
| Wait for file     | `waitFor(() => fs.existsSync(path))`                 |
| Complex condition | `waitFor(() => obj.ready && obj.value > 10)`         |

## Implementation

Generic polling function (adapt to your language):

**JavaScript/TypeScript:**

```javascript
async function waitFor(condition, description, timeoutMs = 5000) {
  const startTime = Date.now();
  while (true) {
    const result = condition();
    if (result) return result;
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }
    await new Promise(r => setTimeout(r, 10));
  }
}
```

**PHP:**

```php
function waitFor(callable $condition, string $description, int $timeoutMs = 5000): mixed {
    $start = microtime(true) * 1000;
    while (true) {
        $result = $condition();
        if ($result) return $result;
        if ((microtime(true) * 1000) - $start > $timeoutMs) {
            throw new Exception("Timeout waiting for {$description} after {$timeoutMs}ms");
        }
        usleep(10000); // 10ms
    }
}
```

**Python:**

```python
import time

def wait_for(condition, description, timeout_s=5.0):
    start = time.time()
    while True:
        result = condition()
        if result:
            return result
        if time.time() - start > timeout_s:
            raise TimeoutError(f"Timeout waiting for {description} after {timeout_s}s")
        time.sleep(0.01)  # 10ms
```

## Common Mistakes

**❌ Polling too fast:** `setTimeout(check, 1)` - wastes CPU
**✅ Fix:** Poll every 10ms

**❌ No timeout:** Loop forever if condition never met
**✅ Fix:** Always include timeout with clear error

**❌ Stale data:** Cache state before loop
**✅ Fix:** Call getter inside loop for fresh data

## When Arbitrary Timeout IS Correct

Sometimes you legitimately need a fixed delay - but only after waiting for the right condition:

```
# Pseudocode
await waitFor(process_started)        # First: wait for condition
await sleep(200ms)                    # Then: wait for known timing
# 200ms = 2 ticks at 100ms intervals - documented and justified
```

**Requirements:**

1. First wait for triggering condition
2. Based on known timing (not guessing)
3. Comment explaining WHY

## Real-World Impact

From debugging session (2025-10-03):

- Fixed 15 flaky tests across 3 files
- Pass rate: 60% → 100%
- Execution time: 40% faster
- No more race conditions
