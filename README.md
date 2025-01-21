# Faster Next Chat

I was inspired by T3 Chat built by @t3dotgg to attempt to create my own AI Chat interface to see if I could stream data quickly. Also I pay for about 3 different models and just have never considered working with the API's. So this is my first attempt.

I know there are some other open source variants out there, but I wanted to build my own interface from scratch with NExt JS and see if I could achieve the same performance at T3.

So far I have only spent a little over a day and a half on this project. There is a lot more to do. I got API connections in place and a simple interface.

## To Do
- Implement Saved Chats
- Implement File Save
- Implement Auth


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
