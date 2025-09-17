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
git clone https://github.com/YOUR_USERNAME/faster-next-chat.git
cd faster-next-chat

# Install dependencies
bun install

# Copy environment template
cp server/.env.example server/.env

# Add your API keys or local endpoints to server/.env
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
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
│   │   ├── lib/          # Utilities, constants, Dexie setup
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
- Features that require a backend database (for now)

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
 * Fetches chat history from IndexedDB
 * @param {string} chatId - The chat ID to fetch
 * @returns {Promise<Chat>} The chat object
 */
export async function getChatById(chatId) {
  return await db.chats.get(chatId);
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

- Use Tailwind utility classes (Tailwind 4.0 with CSS config)
- Use semantic color variables from `globals.css`
- Follow the Catppuccin color scheme
- Responsive design: mobile-first

```jsx
// ✅ Good: Semantic colors, responsive
<div className="bg-latte-base dark:bg-macchiato-base p-4 sm:p-6">
  <button className="px-4 py-2 bg-latte-mauve dark:bg-macchiato-mauve text-white">
    Send
  </button>
</div>

// ❌ Bad: Hard-coded colors, no dark mode
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

Currently, we focus on manual testing. Automated tests are welcome for:
- Critical paths (message sending, persistence)
- Utility functions
- Edge cases

Run tests (when available):
```bash
bun test
```

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
# Test endpoints with curl:
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"model":"gpt-4"}'
```

**IndexedDB issues**:
- Open browser DevTools → Application → IndexedDB
- Check `faster-chat` database

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
- **Dexie**: [dexie.org/docs](https://dexie.org/docs/)

## 🎨 Design Resources

- **Colors**: We use [Catppuccin](https://github.com/catppuccin/catppuccin) (Latte for light, Macchiato for dark)
- **Icons**: Keep them minimal and consistent
- **Spacing**: Use Tailwind spacing scale (p-2, p-4, p-6, etc.)

## 🌍 Community

- **Issues**: [GitHub Issues](https://github.com/1337hero/faster-next-chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/1337hero/faster-next-chat/discussions)
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
