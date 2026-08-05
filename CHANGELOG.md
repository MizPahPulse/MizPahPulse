# Changelog

## v0.2.0 - Major Enhancement Release

### Frontend (~60 improvements)
- **Dark mode persistence** with localStorage and system preference detection
- **Toast notification system** with context provider and 4 variants
- **Error boundary** component for graceful error handling
- **Loading skeleton** components (cards, feed items, tables)
- **Network-configured URLs** replacing hardcoded testnet endpoints
- **useDebounce** hook for optimized search inputs
- **useInfiniteScroll** hook with IntersectionObserver
- **useKeyboardShortcut** hook for global shortcuts (Ctrl+K)
- **useCountUp** animated number transitions for dashboard stats
- **ToastProvider** integrated into app providers
- **Custom 404 page** with navigation links
- **Dashboard loading skeleton** with stat cards and feed items
- **Functional search page** with API integration and debounced input
- **Global error page** with reset functionality
- Connection status indicator in navbar
- Sidebar collapsed state persistence
- UI components: Tooltip, Avatar, Dialog, Progress bar
- Improved event categorization for Soroban events

### Backend (~60 improvements)
- **Standardized API error codes** (11 types) with HTTP status mapping
- **Rate limiting middleware** with sliding window algorithm
- **CORS configuration** with preflight handling
- **Request ID generation and logging** middleware
- **API key authentication** middleware
- **Webhook signature verification** (HMAC-SHA256, timing-safe)
- **Redis Pub/Sub publisher** in ingester for real-time event broadcast
- **Pagination helper** utility for cursor-based API pagination
- **Health check endpoint** (/api/health) with DB/Redis checks
- **Version endpoint** (/api/version) with service info
- **Stats aggregation endpoint** with in-memory caching
- **Contract events endpoint** with filtering
- **Account activity endpoint** with summary
- **SSE streaming endpoint** for live events
- **Webhook delivery worker** with retry logic
- Input sanitization utilities
- Response header helpers (rate limit, cache, security)
- Monitoring/metrics utility
- Structured error handler with typed errors
- Request validation improvements on all endpoints

### Smart Contracts (~60 improvements)
- **Ownership system** with initialize() and transfer_ownership()
- **Pausability** with pause()/unpause()/is_paused()
- **Typed error codes** (PulseError enum, 6 variants)
- **Batch operations** with batch_pulse() for gas efficiency
- **Upgrade mechanism** with version tracking
- **Multi-signature authorization** with configurable threshold
- **Kill switch** for permanent contract termination
- **Rate-limited pulse** with cooldown enforcement
- **Time-locked operations** with execute_after timestamp
- **Gas estimation** for pulse cost
- **Storage cleanup** function
- **Event topic constants** for better indexing
- Contract metadata versioning
- Counter overflow protection
- 27+ passing tests covering all features

### Codebase (~70 improvements)
- **Environment variable validation** with zod
- **Database seed script** with representative test data
- **VS Code workspace settings** and recommended extensions
- **Pre-commit hooks** (Husky + lint-staged)
- **Docker healthchecks** on all services
- **Next.js standalone output** with security headers
- **.dockerignore** for optimized builds
- **Contributing guide** (CONTRIBUTING.md)
- **MIT License**
- **.nvmrc** for Node version management
- **robots.txt** and **manifest.json** for SEO/PWA
- **Prisma audit logging** middleware
- **Caching utility** (Redis + in-memory fallback)
- **Client env helper** for type-safe env access
- **CODEOWNERS** for PR review automation
- **Contracts README** with documentation
- **Notification types** for user preferences
- **Error handler** with typed application errors
- **Vitest setup** with testing mocks
- Improved .gitignore for build artifacts
- Fixed tsconfig rootDir issues
- Prisma fullTextSearchPostgres migration
- turbo.json with db:seed and db:studio tasks

---

## v0.1.0 - Initial Release

- Core blockchain event ingestion engine
- WebSocket server for real-time streaming
- Next.js web app with dashboard
- PulseContract Soroban smart contract
- Prisma database schema
- Freighter wallet integration
- Basic API routes for events, search, webhooks
