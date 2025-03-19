# CLAUDE.md - Codebase Guide

## Build & Development Commands
- `npm run dev` - Start the development server
- `npm run build` - Build for production (runs TypeScript check first)
- `npm run lint` - Run ESLint on TypeScript and TSX files
- `npm run preview` - Preview the production build
- `npm run stripe:webhook` - Setup Stripe webhooks
- `npm run server` - Run the backend server
- `npm run dev:webhook` - Run development environment with webhook support

## Code Style Guidelines
- **TypeScript**: Strict mode enabled with React-JSX. Use explicit types for props and state.
- **Imports**: Group imports by external packages first, then internal modules.
- **Components**: Use functional components with hooks. Prefer named exports.
- **Naming**: PascalCase for components and types, camelCase for variables and functions.
- **Props**: Use interfaces for prop definitions with JSDoc comments for documentation.
- **Styling**: Uses Tailwind CSS with class-variance-authority for component variants.
- **Error Handling**: Use try/catch blocks for async operations, especially API calls.
- **File Structure**: Related components go in dedicated folders with supporting files.
- **State Management**: Use React Context for global state, React Query for remote data.

## Architecture
- React/TypeScript frontend with Vite for building
- Stripe integration for payments/subscriptions
- Supabase for data storage with RLS policies
- Feature-gating system for subscription tiers