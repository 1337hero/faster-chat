# ⚡ Faster Chat — Open, Offline-First LLM Interface

<p align="left">
  <a href="https://preactjs.com/">
    <img src="https://img.shields.io/badge/Preact-10.25-673AB7?logo=preact" alt="Preact" />
  </a>
  <a href="https://hono.dev/">
    <img src="https://img.shields.io/badge/Hono-4.7-FF6B00" alt="Hono" />
  </a>
  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/Tailwind-4.0-38BDF8?logo=tailwindcss" alt="Tailwind CSS" />
  </a>
  <a href="https://tanstack.com/router">
    <img src="https://img.shields.io/badge/TanStack%20Router-1.98-FF4154" alt="TanStack Router" />
  </a>
  <a href="https://dexie.org/">
    <img src="https://img.shields.io/badge/Dexie-IndexedDB-orange?logo=javascript" alt="Dexie" />
  </a>
  <a href="https://sdk.vercel.ai/">
    <img src="https://img.shields.io/badge/Vercel%20AI%20SDK-Streaming-black?logo=vercel" alt="Vercel AI SDK" />
  </a>
  <a href="https://bun.sh/">
    <img src="https://img.shields.io/badge/Bun-Fast%20Builds-yellow?logo=bun" alt="Bun" />
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
  </a>
</p>

> **A blazingly fast, privacy-first chat interface for AI that works with any LLM provider—cloud or completely offline.**

**Faster Chat** is built for developers who want **full control** over their AI conversations. Run it with local models via [Ollama](https://ollama.ai/), connect to any OpenAI-compatible API, or use commercial providers like Claude, GPT, Groq, or Mistral. Your data stays yours—everything works offline-first with local IndexedDB storage.

## 🎯 Why Faster Chat?

- **🔒 Privacy-First**: All conversations stored locally in your browser. No cloud required.
- **🌐 Offline-Ready**: Use completely offline with local LLMs via Ollama, LM Studio, or any local inference server.
- **🔌 Universal Compatibility**: Works with OpenAI, Anthropic, Groq, Mistral, OpenRouter, or any OpenAI-compatible API.
- **⚡ Insanely Fast**: 3KB Preact runtime, zero SSR overhead, streaming responses, instant local saves.
- **🛠️ Self-Hostable**: One-command Docker deployment coming soon. No vendor lock-in.
- **🎨 Modern Stack**: Preact + Hono + TanStack + Tailwind 4.0 + AI SDK.

## ✨ Current Features

- 💬 **Streaming Chat Interface** — Real-time token streaming with Vercel AI SDK
- 🗄️ **Local-First Persistence** — All chats saved to IndexedDB (Dexie) with offline support
- 🤖 **Multi-Provider Support** — Switch between Anthropic, OpenAI, Ollama, and custom endpoints
- 🎨 **Beautiful UI** — Tailwind 4.0 with Catppuccin color scheme and shadcn-style primitives
- 📱 **Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- ⚙️ **Model Selector** — Easy switching between models and providers
- 🔄 **Resume Streams** — Continue interrupted conversations seamlessly

## 🚀 Planned Features

We're building Faster Chat into the most flexible, privacy-respecting AI interface available:

### 🎛️ Settings & Configuration (Coming Soon)
- **API Management UI** — Add/remove/configure API keys and endpoints through a settings page
- **Custom Provider URLs** — Point to LMStudio, GroqCloud, Mistral API, OpenRouter, or your own inference server
- **Model Discovery** — Auto-detect available models from connected providers
- **Offline Model Management** — Browse and pull Ollama models directly from the UI

### 📝 Content & Capabilities
- **Full Markdown & LaTeX Support** — Render beautiful formatted responses with math equations
- **Code Syntax Highlighting** — Automatic language detection and formatting
- **File Attachments** — Upload documents, images, and context for your conversations
- **Image Generation** — Integrated support for DALL-E, Stable Diffusion, and local image models
- **Web Search Integration** — Give your AI real-time internet access (optional)
- **Local RAG** — Vector search over your documents with complete privacy

### 🔐 Privacy & Control
- **Fully Offline Mode** — Work completely disconnected with local models
- **Data Export** — Download all your conversations in standard formats
- **Multi-User Auth** — Role-based access with session management
- **Server Persistence** — Optional SQLite/Postgres sync while keeping offline-first Dexie

### 🎨 Enhanced UX
- **Voice Input/Output** — Speak to your AI and hear responses
- **PWA Support** — Install as a native app with offline capabilities
- **Sharing & Collaboration** — Share conversations with teams
- **Conversation Branching** — Explore alternative responses
- **Dark/Light Themes** — Full theme customization

## 🏗️ Architecture

```
faster-chat/
├── frontend/          # Preact SPA (Vite + TanStack Router/Query)
│   ├── src/
│   │   ├── components/    # Feature-based components
│   │   ├── hooks/         # React hooks for state & side effects
│   │   ├── lib/           # Utilities, constants, Dexie setup
│   │   └── styles/        # Tailwind 4.0 CSS with @theme configs
│   └── vite.config.js     # Vite + Tailwind plugin
│
├── server/            # Hono API server
│   └── src/
│       └── routes/        # AI SDK transport endpoints
│
├── packages/
│   └── shared/           # Shared types and constants
│
└── docs/                 # Documentation and guides
```

**Frontend**: Preact SPA with TanStack Router for routing, TanStack Query for server state, Zustand for UI preferences, and Dexie for local-first persistence. Everything streams through the Vercel AI SDK with chat transport.

**Backend**: Lightweight Hono server that proxies requests to your chosen AI provider. Supports OpenAI, Anthropic, Ollama, and any OpenAI-compatible endpoint.

**Styling**: Tailwind CSS 4.0 with CSS-native configuration, Catppuccin color palettes, and shadcn-inspired component primitives.

## Changelog

See `CHANGELOG.md` for version history (current: 0.2.0 Preact/Hono refactor and TypeScript removal).

## 🔧 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- At least one AI provider:
  - **Offline**: [Ollama](https://ollama.ai/) running locally
  - **Cloud**: API key from OpenAI, Anthropic, Groq, Mistral, or OpenRouter
  - **Self-Hosted**: LM Studio, vLLM, or any OpenAI-compatible inference server

### Quick Start

```bash
# Clone the repository
git clone https://github.com/1337hero/faster-next-chat.git
cd faster-next-chat

# Install dependencies
bun install

# Configure your AI providers
cp server/.env.example server/.env

# Edit server/.env with your API keys or local endpoints:
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# OLLAMA_BASE_URL=http://localhost:11434

# Start development servers
bun run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:3001

### Using Offline with Ollama

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Set in server/.env
OLLAMA_BASE_URL=http://localhost:11434

# Start Faster Chat
bun run dev
```

### Custom Provider Setup

Faster Chat works with **any OpenAI-compatible API**. Examples:

```bash
# LM Studio
OPENAI_BASE_URL=http://localhost:1234/v1

# Groq Cloud
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=gsk_...

# OpenRouter (access 100+ models)
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-...

# Mistral AI
OPENAI_BASE_URL=https://api.mistral.ai/v1
OPENAI_API_KEY=...

# Self-hosted vLLM/TGI
OPENAI_BASE_URL=http://your-inference-server:8000/v1
```

## 📦 Development Commands

**Root (monorepo)**:
```bash
bun run dev         # Start frontend + API concurrently
bun run build       # Build all packages for production
bun run start       # Run production builds
bun run clean       # Remove all build artifacts
```

**Frontend**:
```bash
cd frontend
bun run dev         # Vite dev server on :3000
bun run build       # Production build to dist/
bun run preview     # Preview production build
```

**Server**:
```bash
cd server
bun run dev         # Hono dev server with hot reload on :3001
bun run build       # Build for production
bun run start       # Run production server
```

## 🧭 Roadmap

### Phase 1: Core Refactor ✅
- [x] Migrate from Next.js to Preact + Hono
- [x] Streaming chat with AI SDK
- [x] Local-first persistence (Dexie/IndexedDB)
- [x] Multi-provider support (Anthropic, OpenAI, Ollama)
- [x] Tailwind 4.0 migration

### Phase 2: Settings & Flexibility 🚧
- [ ] Settings page for API/model management
- [ ] Custom provider URL configuration UI
- [ ] Model discovery and auto-detection
- [ ] Ollama model browser and downloader
- [ ] Keyboard shortcuts and accessibility

### Phase 3: Enhanced Capabilities 📋
- [ ] Full Markdown & LaTeX rendering
- [ ] Code syntax highlighting improvements
- [ ] File attachments (documents, images)
- [ ] Image generation integration
- [ ] Web search capabilities
- [ ] Local RAG with vector search

### Phase 4: Multi-User & Deployment 🔜
- [ ] User authentication and sessions
- [ ] Role-based access control
- [ ] Server-side persistence (SQLite/Postgres)
- [ ] Docker image + docker-compose
- [ ] One-command self-hosting
- [ ] Conversation sharing and collaboration

### Phase 5: Advanced Features 🌟
- [ ] Voice input/output
- [ ] PWA with offline install
- [ ] Conversation branching
- [ ] Multi-modal requests (vision, audio)
- [ ] Plugin system for extensions
- [ ] Mobile app (Capacitor)

## 🎨 Design Philosophy

**Faster Chat** follows opinionated architectural principles:

- **Offline-First**: Your data lives in your browser. Server is optional.
- **Provider-Agnostic**: Never lock you into a single AI vendor.
- **Minimal Runtime**: 3KB Preact instead of React. No SSR bloat.
- **Local Control**: Run completely offline with local models.
- **Fast Iteration**: Bun for speed, no TypeScript ceremony, clear patterns.
- **Composable UI**: Small focused components, derive state in render.
- **Delete Aggressively**: Best code is no code. Remove what you don't need.

See `AGENTS.md` for detailed coding principles and architectural decisions.

## 🤝 Contributing

We welcome contributions! Whether it's:
- 🐛 Bug fixes and error handling
- ✨ New provider integrations
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Tests and quality improvements

Please read `AGENTS.md` for our coding philosophy and architectural guidelines. PRs should align with our lightweight, streaming-first, offline-capable approach.

## 💡 Philosophy: Why We Dropped TypeScript

We value **speed over ceremony**. TypeScript's compile step, constant type churn across fast-moving AI SDKs, and mismatched third-party definitions slowed us down more than they helped.

Our guardrails:
- ✅ Runtime schema validation where it matters
- ✅ Shared constants and clear contracts
- ✅ Tests for critical paths
- ✅ JSDoc for complex functions

The trade-off is deliberate: **less friction, faster iteration, easier contribution**.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## ⭐ Star History

If Faster Chat helps you take control of your AI conversations, consider giving us a star!

[![Star History Chart](https://api.star-history.com/svg?repos=open-webui/open-webui,1337hero/faster-next-chat&type=date&legend=top-left)](https://www.star-history.com/#open-webui/open-webui&1337hero/faster-next-chat&type=date&legend=top-left)

---

<p align="center">
  <strong>Built with ❤️ for developers who value privacy, speed, and control.</strong><br>
  <sub>No tracking. No analytics. Just fast, local-first AI conversations.</sub>
</p>
