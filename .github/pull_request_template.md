### Summary
<!-- Brief description of what this PR does -->

**Linked Issue(s):** #<issue_number>

---

### Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 UI/UX improvement
- [ ] ⚡ Performance improvement
- [ ] 🔧 Refactoring (no functional changes)

---

### Coding Principles Checklist (see `AGENTS.md`)
- [ ] **Avoided `useEffect`** unless absolutely necessary (syncing with external systems only)
- [ ] **Did NOT use `useCallback`** (no function memoization)
- [ ] **Minimized `useState`** - derived state as expressions instead of new state variables
- [ ] **TanStack Query for server state** - no duplication in useState/Zustand
- [ ] Followed "delete aggressively" - removed unused code
- [ ] No over-engineering - kept it simple and focused
- [ ] Small, focused components (one responsibility each)

---

### Testing Checklist
- [ ] Tested in **development mode** (`bun run dev`)
- [ ] Tested in **production build** (`bun run build && bun run start` or Docker)
- [ ] Tested in these browsers:
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari (if macOS available)
- [ ] Tested with:
  - [ ] Cloud provider (OpenAI/Anthropic/etc.)
  - [ ] Local provider (Ollama) - if applicable
- [ ] No console errors or warnings
- [ ] No TypeScript-style errors (we use JSDoc, but code should be clean)

---

### Code Quality
- [ ] Followed existing code patterns and file organization
- [ ] Updated documentation (`CLAUDE.md`, `README.md`, or inline comments) if needed
- [ ] No `TODO` comments left in code
- [ ] No hardcoded values - used constants from `packages/shared/src/constants/`
- [ ] Proper error handling at system boundaries (user input, API calls)

---

### Screenshots / GIF (if UI change)
<!-- Drag and drop images here -->

---

### Database Changes (if applicable)
- [ ] Updated frontend schema version in `frontend/src/lib/db.js`
- [ ] Updated backend schema in `server/src/lib/db.js`
- [ ] Tested migration from previous version
- [ ] Documented breaking changes in PR description

---

### Deployment Notes
<!-- Any special deployment considerations, environment variables, or breaking changes -->

---

### Notes for Reviewers
<!-- Anything specific you want reviewers to focus on or be aware of -->
