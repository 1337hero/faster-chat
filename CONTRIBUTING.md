# Contributing to Faster Chat

Thanks for your interest in contributing to Faster Chat! We're building a privacy-first, offline-capable AI chat interface, and we'd love your help making it better.

## 🎯 Our Philosophy

Before you contribute, please understand our core principles:

- **Privacy-First**: User data stays local. No tracking, no analytics, no cloud lock-in.
- **Offline-Capable**: Everything should work without an internet connection (when using local models).
- **Lightweight**: We chose Preact over React for a reason. Keep the bundle small.
- **Fast Iteration**: No TypeScript, minimal ceremony, clear patterns over abstractions.
- **Delete Aggressively**: The best code is no code. Remove what you don't need.
- **Boring is Good**: Use proven patterns. Don't reinvent state management.

Read [`AGENTS.md`](./AGENTS.md) for detailed architectural guidelines.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- Git
- At least one AI provider (Ollama, OpenAI, Anthropic, etc.)

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/faster-chat.git
cd faster-chat

# Install dependencies
bun install

# Copy the environment template.
# The encryption key (API_KEY_ENCRYPTION_KEY) is auto-generated on first run
# if it's missing, so this step is optional.
cp server/.env.example server/.env

# Provider API keys are normally added later in the Admin Panel, not here.
# For local models you can point at an Ollama endpoint:
# OLLAMA_BASE_URL=http://localhost:11434

# Start development servers (frontend + backend)
bun run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

### Project Structure

```
faster-chat/
├── frontend/           # Preact SPA (Vite, TanStack Router/Query, Tailwind 4.0)
│   ├── src/
│   │   ├── components/   # Feature-based components
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # API client, utilities, constants
│   │   └── styles/       # Tailwind CSS
│   └── vite.config.js
│
├── server/             # Hono API server
│   └── src/
│       └── routes/       # API endpoints
│
├── packages/
│   └── shared/          # Shared constants and types
│
└── docs/                # Documentation
```

## 🤝 How to Contribute

### Reporting Bugs

- **Search first**: Check if the issue already exists
- **Use the template**: Provide clear reproduction steps
- **Include environment**: OS, browser, Node/Bun version, provider (Ollama/OpenAI/etc.)
- **Screenshots**: If it's a UI bug, include screenshots

### Suggesting Features

We welcome feature suggestions that align with our goals:

✅ **Good Feature Ideas**:
- New AI provider integrations (Groq, Mistral, local models)
- Offline capabilities improvements
- Privacy enhancements
- Performance optimizations
- Accessibility improvements
- Better markdown/code rendering

❌ **Features We'll Likely Reject**:
- Cloud-only features that break offline mode
- Analytics/tracking (even optional)
- Heavy dependencies that bloat the bundle
- Features that break offline / local-first use (e.g. hard dependencies on a cloud service)

### Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Follow the code style** (see below)

3. **Test your changes**:
   ```bash
   bun run dev      # Test in development
   bun run build    # Ensure production build works
   ```

4. **Write clear commit messages**:
   ```bash
   # Good
   git commit -m "Add Groq provider support"
   git commit -m "Fix sidebar collapse on mobile"

   # Bad
   git commit -m "update stuff"
   git commit -m "wip"
   ```

5. **Push and create PR**:
   ```bash
   git push origin your-branch-name
   ```

   Then open a PR on GitHub with:
   - Clear description of changes
   - Screenshots (for UI changes)
   - Testing steps
   - Reference any related issues

6. **Respond to feedback**: We'll review PRs as quickly as possible. Be open to suggestions.

## 📝 Code Style Guidelines

### JavaScript/JSX

We don't use TypeScript. Follow these patterns instead:

```javascript
// ✅ Good: Clear function with JSDoc where helpful
/**
 * Fetches a chat from the API
 * @param {string} chatId - The chat ID to fetch
 * @returns {Promise<Chat>} The chat object
 */
export async function getChatById(chatId) {
  return apiFetch(`/api/chats/${chatId}`);
}

// ❌ Bad: Unclear, no documentation
export async function get(id) {
  return await db.chats.get(id);
}
```

### React/Preact Patterns

Read `AGENTS.md` for detailed rules. Key principles:

**State Management**:
- ✅ Use TanStack Query for server state
- ✅ Use Zustand for client UI preferences
- ✅ Derive state in render (don't duplicate with `useState`)
- ❌ Avoid `useEffect` unless syncing to external systems
- ❌ Never use `useCallback` (unless profiling proves need)

```javascript
// ✅ Good: Derive state
const hasError = error !== null;
const isValid = email.includes('@');

// ❌ Bad: Duplicate state
const [hasError, setHasError] = useState(false);
const [isValid, setIsValid] = useState(false);
```

**Component Organization**:
- ✅ Feature-based folders (not by type)
- ✅ Small, focused components (one responsibility)
- ✅ Composition over prop-drilling
- ❌ No prop drilling beyond 2 levels

```
// ✅ Good: Feature-based
src/components/chat/
  ├── ChatInterface.jsx
  ├── MessageList.jsx
  ├── MessageItem.jsx
  └── InputArea.jsx

// ❌ Bad: Type-based
src/components/
  ├── buttons/
  ├── inputs/
  └── lists/
```

### Styling (Tailwind CSS)

- Use Tailwind utility classes (Tailwind 4 with CSS-based config)
- Use the semantic `theme-*` color tokens (`bg-theme-surface`, `text-theme-text`, `border-theme-border`, …) so components work across all themes and light/dark
- Never hard-code colors — themes are runtime CSS variables applied on `<html>`
- Responsive design: mobile-first

```jsx
// ✅ Good: Semantic theme tokens, responsive
<div className="bg-theme-surface p-4 sm:p-6">
  <button className="bg-theme-primary px-4 py-2 text-white">
    Send
  </button>
</div>

// ❌ Bad: Hard-coded colors, no theme support
<div style={{ backgroundColor: '#eff1f5', padding: '16px' }}>
  <button style={{ backgroundColor: '#8839ef' }}>Send</button>
</div>
```

### File Naming

- Components: `PascalCase.jsx` (e.g., `ChatInterface.jsx`)
- Utilities: `camelCase.js` (e.g., `formatters.js`)
- Hooks: `use*.js` (e.g., `useChat.js`)
- Constants: `SCREAMING_SNAKE_CASE` in files (e.g., `const API_URL = '...'`)

## 🧪 Testing

The server has a substantial test suite (`bun:test`); the frontend uses Vitest. Run them before opening a PR:

```bash
bun run test           # server tests (server/src/test)
bun run test:frontend  # frontend tests (Vitest)
```

More tests are always welcome, especially for:
- Critical paths (auth, chat completion, persistence)
- Utility functions
- Edge cases

## 🐛 Debugging Tips

**Frontend issues**:
```bash
cd frontend
bun run dev
# Check browser console (F12)
# Use React DevTools
```

**Backend issues**:
```bash
cd server
bun run dev
# Check terminal output
# Hit a public endpoint to confirm the server is up:
curl http://localhost:3001/api/version
```

**Database issues**:
- Data lives in server-side SQLite at `server/data/chat.db`
- Inspect it with any SQLite client (e.g. `sqlite3 server/data/chat.db`)

**Offline mode**:
- Use Ollama: `ollama serve`
- Set `OLLAMA_BASE_URL=http://localhost:11434`

## 📚 Learning Resources

New to the stack? Here's where to learn:

- **Preact**: [preactjs.com/tutorial](https://preactjs.com/tutorial/)
- **Hono**: [hono.dev/getting-started/basic](https://hono.dev/getting-started/basic)
- **TanStack Query**: [tanstack.com/query/latest/docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- **TanStack Router**: [tanstack.com/router/latest/docs](https://tanstack.com/router/latest/docs/framework/react/overview)
- **Tailwind CSS 4.0**: [tailwindcss.com/docs](https://tailwindcss.com/docs/installation)
- **Vercel AI SDK**: [sdk.vercel.ai/docs](https://sdk.vercel.ai/docs)
- **bun:sqlite**: [bun.sh/docs/api/sqlite](https://bun.sh/docs/api/sqlite)

## 🎨 Design Resources

- **Colors**: Runtime CSS-variable themes (multiple built in, including Catppuccin). Use the `theme-*` Tailwind tokens, never hard-coded colors.
- **Icons**: Keep them minimal and consistent
- **Spacing**: Use Tailwind spacing scale (p-2, p-4, p-6, etc.)

## 🌍 Community

- **Issues**: [GitHub Issues](https://github.com/1337hero/faster-chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/1337hero/faster-chat/discussions)
- **PRs**: We review PRs regularly and provide feedback

## 📋 Checklist for PRs

Before submitting, make sure:

- [ ] Code follows the style guidelines in `AGENTS.md`
- [ ] No TypeScript errors (if any .d.ts files need updating)
- [ ] `bun run build` completes successfully
- [ ] Tested in both light and dark modes (if UI change)
- [ ] Tested offline functionality (if relevant)
- [ ] Mobile responsive (if UI change)
- [ ] No console errors or warnings
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains what and why

## ❤️ Code of Conduct

We're here to build great software together. Be kind, respectful, and constructive:

- **Be welcoming**: Everyone was new once
- **Be respectful**: Disagree on ideas, not people
- **Be constructive**: Offer solutions, not just criticism
- **Be patient**: Open source is often volunteer time

Harassment, discrimination, or toxic behavior will not be tolerated.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Questions?** Open an issue or discussion. We're happy to help!

**Thank you for contributing to Faster Chat!** 🚀
