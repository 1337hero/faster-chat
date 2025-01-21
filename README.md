# Faster Next Chat

A modern, responsive chat interface built with Next.js 15 that supports multiple AI models including Claude, GPT-4, and Llama through various providers (Anthropic, OpenAI, Groq).

## Features

- 🚀 Built with Next.js 15 and React 19
- 💬 Support for multiple AI providers:
  - Anthropic
  - OpenAI
  - Groq
  - More
- 🎨 Beautiful UI with Catppuccin Macchiato theme
- ⌨️ Markdown and code syntax highlighting
- 📱 Responsive design with mobile support
- 🔒 Built-in security headers and middleware protection
- ⚡ Edge runtime for optimal performance

## Prerequisites

- Node.js (version specified in package.json)
- Yarn package manager
- API keys for the services you want to use:
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
  - `GROQ_API_KEY`

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/1337hero/faster-next-chat.git
cd faster-next-chat
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file in the root directory and add your API keys:
```env
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
```

4. Start the development server:
```bash
bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

- `bun run dev` - Start development server with Turbopack
- `bun run build` - Create production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier
- `bun run test:format` - Check code formatting

## Architecture

The project follows a modern Next.js application structure:

- `/src/app` - Next.js app router pages and API routes
- `/src/components` - React components organized by feature
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utility functions and constants
- `/src/types` - TypeScript type definitions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - Have fun
