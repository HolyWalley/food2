# Food Planning Web App

## Project Overview
A food planning web app that allows users to:
- Create Food entries (basic products with nutritional data)
- Create Recipe entries (combinations of Foods with quantities)
- Create Menu entries (combinations of Foods and Recipes with portions/quantities)
- Local-first with sync capabilities

## Technical Stack
- **Frontend**: React, TypeScript, Vite
- **Backend**: Cloudflare Functions (serverless)
- **Database**: PouchDB (local) with optional remote sync
- **Deployment**: Cloudflare Pages
- **Testing**: Jest, React Testing Library
- **State Management**: React Query + Context API
- **UI Components**: Tailwind CSS
- **Build/Development**: npm, Vite, ESLint, Prettier

## Development Commands
- `npm install`: Install dependencies
- `npm run dev`: Start local development server
- `npm run build`: Build production version
- `npm run test`: Run tests
- `npm run lint`: Run ESLint
- `npm run typecheck`: Check TypeScript types

## Architecture
- **Local-first** approach with PouchDB
- Modular components for reusability
- Type-safe data structures
- Clean separation of concerns (data/UI/logic)

## AI Features
- Nutritional analysis of recipes and menus
- Ingredient suggestions based on user preferences
- Meal planning assistance

## Security Considerations
- No credentials in frontend code or git repository
- Environment variables for sensitive configuration
- Proper authentication for any remote data sync

## Testing Strategy
- Unit tests for utility functions and hooks
- Component tests for UI elements
- Integration tests for key user flows
- E2E tests for critical paths

## Deployment Process
1. Set up Cloudflare account and create a new Pages project
2. Configure build settings (build command: `npm run build`, output directory: `dist`)
3. Set up environment variables in Cloudflare Pages dashboard
4. Deploy Cloudflare Functions for backend services
5. Connect custom domain if needed

## Local Development
1. Clone repository
2. Run `npm install`
3. Create `.dev.vars` file with required environment variables
4. Run `npm run dev` to start local development server
