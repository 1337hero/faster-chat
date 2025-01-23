# Faster Next Chat

## About:
This project was inspired by T3 Chat built by [@t3dotgg](https://github.com/t3dotgg). I wanted to take on a fun challenge: Implement AI streaming within a NextJS app. I noticed T3 used IndexedDB, which was perfect timing since I needed to implement a "Offline First" approach in a client project I was working on. 

And while their are some great open source AI Chat interfaces out there, I wanted to test my ability to build my own. Thus, here we are. 

Also, hat tip to this video [How I Built T3 Chat in 5 Days](https://youtu.be/QLvIoi2s1zY?si=tseIII4RsH2ZX-1o) for the clue on Dexie. It's old but easy to work with.

And yes, for those wondering I am using the [Catppuccin Macchiato](https://github.com/catppuccin/catppuccin) color scheme.

## Structure
I am using a local-first streaming approach with IndexedDB via [Dexie.js](https://dexie.org/) and making use of the [Vercel AI SDK](https://sdk.vercel.ai/).

**Here's how it's implemented:**

1. **Database Layer (db.ts):**
   - Using Dexie to manage IndexedDB
   - Two tables: chats and messages
   - Full CRUD operations for chats and messages
   - Proper indexing for efficient queries

2. **Reactive Data Layer (usePersistentChat.ts)**
   - Using useLiveQuery from dexie-react-hooks for reactive queries
   - Automatic UI updates when data changes in IndexedDB
   - Real-time chat and message loading
   - Proper message persistence

3. **Message Flow:**
   - Messages are stored locally in IndexedDB
   - UI renders directly from IndexedDB data
   - New messages are immediately persisted
   - Changes trigger automatic UI updates

4. **Local-First Benefits:**
  - Instant data availability
  - Real-time UI updates 
  - Smooth user experience

The local first approach is what makes the interface feel fast, especially switching between chats.

## To Do 
- [ ] Implement method of DELETING chats.
- [ ] Implement System Prompts
- [ ] Implement File Upload
- [ ] Implement Auth for UserLogin
- [ ] Implement a self hosted deployment script (kinda want this on my local network)

I want to solve for code blocks, they are kinda janky at the moment. Could use improvement.


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
