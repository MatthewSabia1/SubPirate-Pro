# CLAUDE.md - Codebase Guide

## Build & Development Commands
- `npm run dev` - Start the development server
- `npm run build` - Build for production (runs TypeScript check first)
- `npm run lint` - Run ESLint on TypeScript and TSX files
- `npm run preview` - Preview the production build
- `npm run server` - Run the backend server
- `npm run webhook` - Run the webhook server
- `npm run dev:stripe` - Run dev environment with Stripe webhook support
- `npm run dev:campaigns` - Run dev environment with campaign scheduler
- `npm run campaigns:test` - Run campaign scheduler tests

## Code Style Guidelines
- **TypeScript**: Strict mode with `noUnusedLocals` and `noUnusedParameters` enabled
- **Imports**: Group external packages first, then internal modules
- **React**: Use functional components with hooks; prefer named exports
- **Naming**: PascalCase for components/types, camelCase for variables/functions
- **Props**: Define interfaces with JSDoc comments for documentation
- **Styling**: Tailwind CSS with class-variance-authority for component variants
- **Error Handling**: Use react-error-boundary for components; try/catch for async operations
- **State Management**: React Context for global state, React Query for remote data

## Architecture
- React 18 + TypeScript + Vite frontend
- Supabase for database with RLS policies
- Stripe integration for payments/subscriptions
- Express for backend services (webhooks, campaign scheduler)
- Feature-gating system for subscription tiers