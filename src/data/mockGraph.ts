import type { CodebaseGraph, AxonNode, AxonEdge } from '@/types/graph';

// ═══════════════════════════════════════════════
//  Mock Codebase Graph — Realistic SaaS API
//  Simulates a Node.js/TS multi-tenant SaaS backend
// ═══════════════════════════════════════════════

const nodes: AxonNode[] = [
  // ── Entry Points / Services ──────────────────
  {
    id: 'server',
    type: 'service',
    label: 'server.ts',
    metadata: {
      loc: 142, complexity: 4, churn: 85, dependents: 0, dependencies: 6,
      coverage: 72, author: 'alex.k', path: 'src/server.ts', language: 'typescript',
      lastModified: '2h ago', riskLevel: 'low', flags: [],
      isEntryPoint: true,
      semanticSummary: 'Express server bootstrap. Registers all middleware, mounts routers, and connects to the database. The application entry point.',
    },
    position: { x: 600, y: 50 },
  },
  {
    id: 'app',
    type: 'module',
    label: 'app.ts',
    metadata: {
      loc: 210, complexity: 8, churn: 60, dependents: 1, dependencies: 8,
      coverage: 65, author: 'alex.k', path: 'src/app.ts', language: 'typescript',
      lastModified: '1d ago', riskLevel: 'medium', flags: [],
      semanticSummary: 'Express app configuration. CORS, body parsing, rate limiting, and global error handling middleware are registered here.',
    },
    position: { x: 600, y: 200 },
  },
  // ── Auth Layer ────────────────────────────────
  {
    id: 'auth-router',
    type: 'module',
    label: 'routes/auth.ts',
    metadata: {
      loc: 180, complexity: 9, churn: 45, dependents: 1, dependencies: 4,
      coverage: 88, author: 'maya.r', path: 'src/routes/auth.ts', language: 'typescript',
      lastModified: '3d ago', riskLevel: 'medium', flags: [],
      semanticSummary: 'Authentication routes: POST /login, POST /register, POST /refresh, DELETE /logout. Delegates to AuthService.',
    },
    position: { x: 200, y: 380 },
  },
  {
    id: 'auth-service',
    type: 'class',
    label: 'AuthService',
    metadata: {
      loc: 340, complexity: 14, churn: 30, dependents: 3, dependencies: 5,
      coverage: 91, author: 'maya.r', path: 'src/services/auth.service.ts', language: 'typescript',
      lastModified: '5d ago', riskLevel: 'high', flags: ['security-critical'],
      semanticSummary: 'Core authentication service. Handles JWT token generation/validation, bcrypt password hashing, session management, and Auth0 OAuth integration.',
      functions: [
        { name: 'login', line: 28, kind: 'method', isExported: true },
        { name: 'register', line: 67, kind: 'method', isExported: true },
        { name: 'refreshToken', line: 112, kind: 'method', isExported: true },
        { name: 'logout', line: 148, kind: 'method', isExported: true },
        { name: 'validateSession', line: 180, kind: 'method', isExported: true },
        { name: 'hashPassword', line: 210, kind: 'method', isExported: false },
        { name: 'comparePassword', line: 225, kind: 'method', isExported: false },
        { name: 'AuthService', line: 12, kind: 'class', isExported: true },
      ],
    },
    position: { x: 80, y: 560 },
  },
  {
    id: 'jwt-util',
    type: 'function',
    label: 'jwt.util.ts',
    metadata: {
      loc: 95, complexity: 6, churn: 10, dependents: 4, dependencies: 1,
      coverage: 95, author: 'maya.r', path: 'src/utils/jwt.util.ts', language: 'typescript',
      lastModified: '2w ago', riskLevel: 'high', flags: ['security-critical'],
      semanticSummary: 'JWT token utilities: sign(), verify(), decode(), and refresh token rotation logic. Used by 4 modules — any change here is high risk.',
      functions: [
        { name: 'signToken', line: 14, kind: 'function', isExported: true },
        { name: 'verifyToken', line: 34, kind: 'function', isExported: true },
        { name: 'decodeToken', line: 54, kind: 'function', isExported: true },
        { name: 'rotateRefreshToken', line: 68, kind: 'function', isExported: true },
        { name: 'JWT_EXPIRY', line: 8, kind: 'const', isExported: true },
      ],
    },
    position: { x: -80, y: 720 },
  },
  {
    id: 'auth-middleware',
    type: 'function',
    label: 'middleware/auth.ts',
    metadata: {
      loc: 78, complexity: 7, churn: 15, dependents: 8, dependencies: 2,
      coverage: 89, author: 'maya.r', path: 'src/middleware/auth.ts', language: 'typescript',
      lastModified: '1w ago', riskLevel: 'critical', flags: ['single-point-of-failure', 'security-critical'],
      semanticSummary: 'JWT validation middleware. Imported by ALL 8 protected route modules. Any bug here takes down authentication for the entire platform.',
    },
    position: { x: 320, y: 560 },
  },
  // ── Billing Layer ─────────────────────────────
  {
    id: 'billing-router',
    type: 'module',
    label: 'routes/billing.ts',
    metadata: {
      loc: 155, complexity: 11, churn: 55, dependents: 1, dependencies: 3,
      coverage: 62, author: 'james.o', path: 'src/routes/billing.ts', language: 'typescript',
      lastModified: '1d ago', riskLevel: 'high', flags: ['low-coverage'],
      semanticSummary: 'Billing routes: POST /subscribe, POST /cancel, POST /webhook, GET /invoices. Handles Stripe subscription lifecycle.',
    },
    position: { x: 600, y: 380 },
  },
  {
    id: 'billing-service',
    type: 'class',
    label: 'BillingService',
    metadata: {
      loc: 520, complexity: 18, churn: 70, dependents: 2, dependencies: 6,
      coverage: 45, author: 'james.o', path: 'src/services/billing.service.ts', language: 'typescript',
      lastModified: '6h ago', riskLevel: 'critical', flags: ['low-coverage', 'high-complexity', 'high-churn'],
      semanticSummary: 'Stripe integration service. Manages subscriptions, webhook processing, invoice generation, and multi-tenant billing isolation. COMPLEXITY WARNING: 18 cyclomatic complexity.',
      functions: [
        { name: 'BillingService', line: 18, kind: 'class', isExported: true },
        { name: 'createSubscription', line: 45, kind: 'method', isExported: true },
        { name: 'cancelSubscription', line: 98, kind: 'method', isExported: true },
        { name: 'processWebhook', line: 152, kind: 'method', isExported: true },
        { name: 'generateInvoice', line: 215, kind: 'method', isExported: true },
        { name: 'applyProration', line: 268, kind: 'method', isExported: false },
        { name: 'validatePlanLimits', line: 310, kind: 'method', isExported: false },
        { name: 'syncStripeCustomer', line: 380, kind: 'method', isExported: true },
      ],
    },
    position: { x: 560, y: 580 },
  },
  {
    id: 'stripe-webhook',
    type: 'function',
    label: 'stripe.webhook.ts',
    metadata: {
      loc: 210, complexity: 15, churn: 40, dependents: 1, dependencies: 2,
      coverage: 38, author: 'james.o', path: 'src/webhooks/stripe.ts', language: 'typescript',
      lastModified: '2d ago', riskLevel: 'critical', flags: ['low-coverage', 'no-integration-tests'],
      semanticSummary: 'Stripe webhook handler. Processes payment_intent.succeeded, customer.subscription.*, and invoice.* events. Low test coverage is a critical risk.',
    },
    position: { x: 720, y: 720 },
  },
  // ── User Domain ───────────────────────────────
  {
    id: 'user-router',
    type: 'module',
    label: 'routes/users.ts',
    metadata: {
      loc: 120, complexity: 6, churn: 25, dependents: 1, dependencies: 3,
      coverage: 78, author: 'sarah.p', path: 'src/routes/users.ts', language: 'typescript',
      lastModified: '4d ago', riskLevel: 'low', flags: [],
      semanticSummary: 'User management routes: GET /me, PATCH /profile, DELETE /account. Protected by auth middleware.',
    },
    position: { x: 1000, y: 380 },
  },
  {
    id: 'user-service',
    type: 'class',
    label: 'UserService',
    metadata: {
      loc: 280, complexity: 9, churn: 20, dependents: 4, dependencies: 3,
      coverage: 82, author: 'sarah.p', path: 'src/services/user.service.ts', language: 'typescript',
      lastModified: '1w ago', riskLevel: 'low', flags: [],
      semanticSummary: 'User CRUD operations, profile management, multi-tenant isolation enforcement, and soft delete logic.',
    },
    position: { x: 1080, y: 580 },
  },
  // ── Database Layer ────────────────────────────
  {
    id: 'prisma',
    type: 'database',
    label: 'prisma/schema.prisma',
    metadata: {
      loc: 380, complexity: 3, churn: 15, dependents: 12, dependencies: 0,
      coverage: 0, author: 'alex.k', path: 'prisma/schema.prisma', language: 'unknown',
      lastModified: '3d ago', riskLevel: 'critical', flags: ['single-point-of-failure'],
      semanticSummary: 'PostgreSQL database schema. 12 models including User, Organization, Subscription, Invoice, AuditLog. This is imported by 12 services — the foundation of data integrity.',
    },
    position: { x: 580, y: 800 },
  },
  {
    id: 'db-client',
    type: 'module',
    label: 'lib/database.ts',
    metadata: {
      loc: 45, complexity: 2, churn: 5, dependents: 10, dependencies: 1,
      coverage: 100, author: 'alex.k', path: 'src/lib/database.ts', language: 'typescript',
      lastModified: '2w ago', riskLevel: 'critical', flags: ['single-point-of-failure'],
      semanticSummary: 'Singleton Prisma client instantiation with connection pooling config. Imported by 10 services. Any misconfiguration here breaks all DB access.',
    },
    position: { x: 440, y: 950 },
  },
  // ── API Gateway ───────────────────────────────
  {
    id: 'api-gateway',
    type: 'api',
    label: 'middleware/rateLimit.ts',
    metadata: {
      loc: 88, complexity: 5, churn: 8, dependents: 1, dependencies: 1,
      coverage: 70, author: 'alex.k', path: 'src/middleware/rateLimit.ts', language: 'typescript',
      lastModified: '1w ago', riskLevel: 'low', flags: [],
      semanticSummary: 'Redis-backed rate limiting middleware. Per-IP and per-user limits with sliding window algorithm.',
    },
    position: { x: 940, y: 200 },
  },
  {
    id: 'logger',
    type: 'module',
    label: 'lib/logger.ts',
    metadata: {
      loc: 62, complexity: 2, churn: 3, dependents: 15, dependencies: 0,
      coverage: 100, author: 'alex.k', path: 'src/lib/logger.ts', language: 'typescript',
      lastModified: '3w ago', riskLevel: 'low', flags: [],
      semanticSummary: 'Winston logger configuration. Structured JSON output with log levels, request tracing via correlation IDs.',
    },
    position: { x: 920, y: 50 },
  },
  // ── Config / Orphans ─────────────────────────
  {
    id: 'config',
    type: 'module',
    label: 'config/index.ts',
    metadata: {
      loc: 95, complexity: 3, churn: 12, dependents: 18, dependencies: 0,
      coverage: 100, author: 'alex.k', path: 'src/config/index.ts', language: 'typescript',
      lastModified: '1w ago', riskLevel: 'critical', flags: ['single-point-of-failure'],
      semanticSummary: 'Centralized env-var config with Zod validation. Imports from 18 modules — any key rename breaks the entire application.',
    },
    position: { x: 1200, y: 580 },
  },
  {
    id: 'orphan-1',
    type: 'file',
    label: 'utils/deprecated.ts',
    metadata: {
      loc: 185, complexity: 12, churn: 0, dependents: 0, dependencies: 2,
      coverage: 0, author: 'unknown', path: 'src/utils/deprecated.ts', language: 'typescript',
      lastModified: '8mo ago', riskLevel: 'medium', flags: ['orphan', 'no-tests'],
      isOrphan: true,
      semanticSummary: 'Deprecated utility functions. Zero dependents. Last modified 8 months ago. Safe to remove — likely dead code from a previous API version.',
    },
    position: { x: 1280, y: 200 },
  },
  {
    id: 'permissions',
    type: 'module',
    label: 'lib/permissions.ts',
    metadata: {
      loc: 220, complexity: 10, churn: 22, dependents: 22, dependencies: 2,
      coverage: 55, author: 'maya.r', path: 'src/lib/permissions.ts', language: 'typescript',
      lastModified: '2d ago', riskLevel: 'critical', flags: ['single-point-of-failure', 'low-coverage'],
      semanticSummary: '⚠️ This file is imported by 22 others. RBAC permission checking, feature flags, and plan-based access control. Any change here is extremely high risk.',
      functions: [
        { name: 'checkPermission', line: 22, kind: 'function', isExported: true },
        { name: 'hasFeatureFlag', line: 58, kind: 'function', isExported: true },
        { name: 'getPlanLimits', line: 90, kind: 'function', isExported: true },
        { name: 'enforceRateLimit', line: 118, kind: 'function', isExported: true },
        { name: 'PERMISSIONS', line: 10, kind: 'const', isExported: true },
        { name: 'PLAN_LIMITS', line: 14, kind: 'const', isExported: true },
      ],
    },
    position: { x: 700, y: 950 },
  },
];

const edges: AxonEdge[] = [
  // Server → App
  { id: 'e1', source: 'server', target: 'app', relation: 'imports', strength: 1 },
  { id: 'e2', source: 'server', target: 'logger', relation: 'imports', strength: 0.6 },
  { id: 'e3', source: 'server', target: 'config', relation: 'imports', strength: 0.8 },
  // App → Routers
  { id: 'e4', source: 'app', target: 'auth-router', relation: 'composes', strength: 0.9 },
  { id: 'e5', source: 'app', target: 'billing-router', relation: 'composes', strength: 0.9 },
  { id: 'e6', source: 'app', target: 'user-router', relation: 'composes', strength: 0.9 },
  { id: 'e7', source: 'app', target: 'api-gateway', relation: 'imports', strength: 0.7 },
  // Auth flow
  { id: 'e8', source: 'auth-router', target: 'auth-service', relation: 'calls', strength: 1 },
  { id: 'e9', source: 'auth-router', target: 'auth-middleware', relation: 'imports', strength: 0.8 },
  { id: 'e10', source: 'auth-service', target: 'jwt-util', relation: 'calls', strength: 0.9 },
  { id: 'e11', source: 'auth-service', target: 'db-client', relation: 'queries', strength: 0.8 },
  { id: 'e12', source: 'auth-middleware', target: 'jwt-util', relation: 'calls', strength: 0.9 },
  // User flow
  { id: 'e13', source: 'user-router', target: 'user-service', relation: 'calls', strength: 1 },
  { id: 'e14', source: 'user-router', target: 'auth-middleware', relation: 'imports', strength: 0.8 },
  { id: 'e15', source: 'user-service', target: 'db-client', relation: 'queries', strength: 0.9 },
  { id: 'e16', source: 'user-service', target: 'permissions', relation: 'calls', strength: 0.7 },
  // Billing flow
  { id: 'e17', source: 'billing-router', target: 'billing-service', relation: 'calls', strength: 1 },
  { id: 'e18', source: 'billing-router', target: 'auth-middleware', relation: 'imports', strength: 0.8 },
  { id: 'e19', source: 'billing-service', target: 'stripe-webhook', relation: 'calls', strength: 0.8 },
  { id: 'e20', source: 'billing-service', target: 'db-client', relation: 'queries', strength: 0.9 },
  { id: 'e21', source: 'billing-service', target: 'user-service', relation: 'calls', strength: 0.6 },
  { id: 'e22', source: 'billing-service', target: 'permissions', relation: 'calls', strength: 0.7 },
  // DB layer
  { id: 'e23', source: 'db-client', target: 'prisma', relation: 'queries', strength: 1 },
  { id: 'e24', source: 'auth-service', target: 'prisma', relation: 'queries', strength: 0.5 },
  { id: 'e25', source: 'permissions', target: 'db-client', relation: 'queries', strength: 0.7 },
  // Config used everywhere
  { id: 'e26', source: 'auth-service', target: 'config', relation: 'imports', strength: 0.5 },
  { id: 'e27', source: 'billing-service', target: 'config', relation: 'imports', strength: 0.5 },
  { id: 'e28', source: 'db-client', target: 'config', relation: 'imports', strength: 0.5 },
  // Logger used everywhere
  { id: 'e29', source: 'auth-service', target: 'logger', relation: 'imports', strength: 0.4 },
  { id: 'e30', source: 'billing-service', target: 'logger', relation: 'imports', strength: 0.4 },
  { id: 'e31', source: 'user-service', target: 'logger', relation: 'imports', strength: 0.4 },
  // Orphan (isolated)
  { id: 'e32', source: 'orphan-1', target: 'logger', relation: 'imports', strength: 0.3 },
];

export const mockGraph: CodebaseGraph = {
  nodes,
  edges,
  version: 'a3f9c12',
  repoUrl: 'github.com/qadna/platform-api',
  language: 'typescript',
  analyzedAt: new Date().toISOString(),
  stats: {
    totalFiles: 47,
    totalLines: 12840,
    avgComplexity: 7.4,
    hotspots: 4,
    orphans: 1,
    circularDeps: 0,
    testCoverage: 68,
    languages: { TypeScript: 89, JavaScript: 7, Other: 4 },
  },
  summary: 'This is a multi-tenant SaaS API built with Node.js/Express and TypeScript. Authentication uses JWT plus Auth0 OAuth. Payments are processed through Stripe with webhook-driven subscription management. Data layer uses Prisma ORM with PostgreSQL. The `permissions.ts` module is a critical single point of failure — imported by 22 modules. BillingService has dangerously low test coverage (45%) with high churn.',
  entryPoints: ['server'],
};

// Pre-packaged example repos for the landing page
export const exampleRepos = [
  { url: 'github.com/qadna/platform-api', label: 'QA DNA Platform', lang: 'TypeScript', stars: 0, private: true },
  { url: 'github.com/vercel/next.js', label: 'Next.js', lang: 'TypeScript', stars: 125000 },
  { url: 'github.com/fastapi/fastapi', label: 'FastAPI', lang: 'Python', stars: 78000 },
  { url: 'github.com/tokio-rs/tokio', label: 'Tokio Runtime', lang: 'Rust', stars: 26000 },
];
