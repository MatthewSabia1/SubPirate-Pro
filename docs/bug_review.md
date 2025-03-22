<!-- 
AI AGENT INSTRUCTIONS:
1. As you fix each issue in this checklist, mark it as completed by changing "[ ]" to "✅".
2. When checking off an item, add a brief comment below the item with:
   - Date fixed: YYYY-MM-DD
   - Fix summary: Brief description of the solution implemented
   - PR/Commit: Reference to the PR or commit where the fix was implemented
3. DO NOT remove any items from this list, only mark them as completed.
4. If you discover that an issue is a duplicate or invalid, mark it as completed and note the reason.
5. If an issue requires additional context or is more complex than initially described, add notes but keep the item unchecked until fully resolved.
6. If a bug takes a long multi step process to fix and needs many steps to fix, create a sublist to doccument the progress under the item in the same checklist style as the rest of the doc.
-->

# SubPirate Codebase Bug Review

## CRITICAL ISSUES (HIGH PRIORITY)

### Security Vulnerabilities
- [ ] **Hardcoded Service Role Key in Webhook Server**
  - Location: `/webhook-server.js` (lines 97-99)
  - Issue: A hardcoded service role key with unrestricted database access is included in the code
  - Impact: Complete database compromise as this key provides admin-level access to all data
  - Suggestion: Remove hardcoded key and use environment variables exclusively

- [ ] **Insecure JWT Impersonation in RLS Tester**
  - Location: `/src/lib/rls-tester.ts` (lines 43-50)
  - Issue: Creates JWT tokens that can impersonate any user without proper authorization checks
  - Impact: Allows complete identity theft of any user if exposed
  - Suggestion: Remove or secure this functionality with strong authorization

- [ ] **SQL Injection Vulnerability in Direct Database Access**
  - Location: `/webhook-server.js` (lines 427-462)
  - Issue: Query parameters are directly incorporated in SQL statements without proper parameterization
  - Impact: Potential SQL injection allowing unauthorized access
  - Suggestion: Use parameterized queries for all database operations

- [ ] **Missing Authentication on Critical API Endpoints**
  - Location: `/webhook-server.js` (lines 398-424)
  - Issue: `/api/campaigns/process` endpoint lacks authentication
  - Impact: Unauthorized campaign post processing
  - Suggestion: Add proper authentication middleware to all API routes

- [ ] **Insecure Credential Handling in RedditOAuthCallback**
  - Location: `/src/pages/RedditOAuthCallback.tsx` (lines 214-216)
  - Issue: Client and server secrets stored in reddit_accounts table and exposed in client-side code 
  - Impact: Exposed credentials could be used to access Reddit accounts
  - Suggestion: Move token exchange to a server-side endpoint and never expose secrets in client code

- [ ] **Stripe API Key Exposure in Client-Side Code**
  - Location: `/src/lib/stripe/client.ts` (lines 5-7)
  - Issue: The code attempts to access `process.env.STRIPE_SECRET_KEY` in client-side code
  - Impact: If the secret key is included in the client build, it would expose full access to the Stripe account
  - Suggestion: Move all Stripe key handling to server-side code only

- [ ] **Missing Cross-Site Request Forgery (CSRF) Protection**
  - Location: `/src/contexts/AuthContext.tsx` (entire file)
  - Issue: No CSRF tokens or protections implemented for authentication operations
  - Impact: Vulnerable to CSRF attacks that could perform actions on behalf of authenticated users
  - Suggestion: Implement CSRF tokens for all state-changing operations

- [ ] **Missing Content-Security-Policy Headers**
  - Location: `/webhook-server.js` (lines 54-56)
  - Issue: Helmet is used but no specific CSP configuration is provided
  - Impact: Potential for XSS attacks by injecting malicious scripts
  - Suggestion: Configure CSP headers appropriately

- [ ] **Hardcoded API Keys**
  - Location: `/src/lib/openrouter.ts` (lines 5, 26)
  - Location: `/src/features/campaigns/services/reddit.ts` (line 379)
  - Issue: API keys exposed in client-side code
  - Impact: Unauthorized use of paid API services and potential account compromise
  - Suggestion: Move all API key handling to server-side endpoints

### Database Integrity Issues
- [ ] **Recursive RLS Policy Issues in Project Table**
  - Location: `/migrations/consolidated_rls_implementation.sql`
  - Issue: Project members policy has a circular reference, querying the same table within the policy conditions
  - Impact: Causes infinite recursion and performance degradation
  - Suggestion: Rewrite policy to avoid recursive references

- [ ] **Insufficient RLS Policy Testing**
  - Location: `/src/lib/rls-tester.ts`
  - Issue: Testing is incomplete for many critical tables
  - Impact: Security vulnerabilities may exist in untested areas
  - Suggestion: Implement comprehensive RLS policy tests for all tables

- [ ] **Race Condition in Stripe Webhook Processing**
  - Location: `/webhook-server.js` (lines 164-270)
  - Issue: No locking mechanism when updating subscription data
  - Impact: Data inconsistency or loss when processing concurrent webhook events
  - Suggestion: Implement proper transaction isolation

- [ ] **No Transaction Usage for Multi-Step Database Operations**
  - Location: `/migrations/campaigns_feature.sql`
  - Issue: Missing transaction implementation for critical multi-step operations
  - Impact: Data inconsistency if operations fail partway through
  - Suggestion: Wrap related operations in transactions

- [ ] **Race Condition in Campaign Scheduler**
  - Location: `/src/features/campaigns/services/scheduler.ts` (lines 46-61)
  - Issue: No locking mechanism when processing posts
  - Impact: Duplicate post submissions and data inconsistency
  - Suggestion: Implement proper locking or use transactions

### Media and File Security
- [ ] **Insecure File Upload Validation in Campaign API**
  - Location: `/src/features/campaigns/lib/api.ts` (lines 230-296)
  - Issue: No server-side validation of file types before storage and no proper sanitization of filenames
  - Impact: Potential upload of malicious files that could be executed or used for XSS attacks
  - Suggestion: Implement proper file type validation and filename sanitization

- [ ] **Storage Bucket Policy Creation Issue**
  - Location: `/src/features/campaigns/lib/api.ts` (lines 264-285)
  - Issue: Uses `execute_sql` RPC which is dangerous and might have excessive permissions
  - Impact: Could create insecure storage policies that allow unauthorized access to media files
  - Suggestion: Use service_role key with proper permissioning for storage bucket policy management

- [ ] **No Sanitization of Content for Reddit Post Creation**
  - Location: `/src/features/campaigns/services/reddit.ts`
  - Issue: User-provided content is not properly sanitized before being submitted to the Reddit API
  - Impact: Potential for XSS attacks or injection of malicious content through the application to Reddit
  - Suggestion: Implement content sanitization for all user-generated content

## DATA INTEGRITY AND PERFORMANCE ISSUES

### Database Performance
- [ ] **Missing Database Indexes for Performance-Critical Columns**
  - Location: Database schema
  - Issue: Missing indexes for commonly queried columns (user_id, project_id)
  - Impact: Performance degradation when searching through large datasets
  - Suggestion: Add appropriate indexes to frequently queried columns

- [ ] **N+1 Query Problem in Campaign Context**
  - Location: `/src/contexts/CampaignContext.tsx` (lines 712-727)
  - Issue: Makes separate sequential API calls to fetch campaigns, media items, and tags
  - Impact: Significant page load delay and database overhead for users with many campaigns
  - Suggestion: Consolidate queries or implement GraphQL for more efficient data fetching

- [ ] **Inefficient Database Queries in Media Tag Processing**
  - Location: `/src/features/campaigns/lib/api.ts` (lines 144-180)
  - Issue: Complex nested queries and client-side restructuring for media items with tags
  - Impact: Slow loading of media libraries, especially as media items and tags grow in number
  - Suggestion: Optimize with a single efficient JOIN query and server-side data transformation

- [ ] **Multiple Sequential Database Calls**
  - Location: `/src/pages/RedditAccounts.tsx` (lines 51-114)
  - Issue: Multiple sequential database calls could be combined
  - Impact: Slower page load times and inefficient API usage
  - Suggestion: Consolidate database operations to reduce API calls

### Resource Management
- [ ] **Memory Leaks in DOM Portal for Tooltips**
  - Location: `/src/components/HeatmapChart.tsx` (lines 337-403)
  - Issue: React portals create tooltip elements without proper cleanup
  - Impact: Degraded application performance over time, especially on memory-constrained devices
  - Suggestion: Ensure proper cleanup of portals in the component lifecycle

- [ ] **Blocking DOM Manipulation in HeatmapChart**
  - Location: `/src/components/HeatmapChart.tsx` (lines 273-303)
  - Issue: Direct DOM manipulation for neighboring cell hover effects blocks the main thread
  - Impact: Causes frame drops and UI freezes during user interaction with the heatmap
  - Suggestion: Replace with React-based state management and CSS for hover effects

- [ ] **Missing Pagination for Large Data Sets**
  - Location: Multiple components
  - Issue: No pagination for large result sets
  - Impact: Memory issues and performance degradation
  - Suggestion: Implement proper pagination with cursor-based or offset-based approaches

- [ ] **Inefficient Batch Processing in Campaign Scheduler**
  - Location: `/webhook-server.js` (lines 397-424)
  - Issue: Runs all scheduled posts in sequence without batching
  - Impact: Server could become unresponsive when many campaigns need processing at once
  - Suggestion: Implement batching, throttling, and possibly a queue system for campaign processing

- [ ] **No Cleanup Mechanisms for Timers and Intervals**
  - Location: Multiple components
  - Issue: Intervals and timers not properly cleaned up on component unmount
  - Impact: Memory leaks and continued processing even after component unmount
  - Suggestion: Implement proper cleanup in useEffect return functions

### Performance Optimization
- [ ] **Excessive Re-renders in Analytics Components**
  - Location: `/src/pages/Analytics.tsx`
  - Issue: Missing memoization for expensive filter transformations and chart data calculations
  - Impact: Poor performance when viewing analytics dashboards with multiple charts
  - Suggestion: Use React.memo, useMemo, and useCallback to optimize renders

- [ ] **Unoptimized Reddit API Request Tracking**
  - Location: `/src/lib/redditApi.ts` (lines 335-367)
  - Issue: Every API request triggers a Supabase upsert operation to track usage
  - Impact: Database contention and potential performance bottlenecks during high usage
  - Suggestion: Batch tracking updates or use a more efficient storage mechanism

- [ ] **Blocking Operations in Webhook Server**
  - Location: `/webhook-server.js` (lines 164-270)
  - Issue: Stripe webhook handler performs multiple sequential database operations
  - Impact: Potential loss of webhook events if processing takes too long
  - Suggestion: Make webhook handlers asynchronous and implement a queue for processing

## API INTEGRATION ISSUES

### Reddit API Integration
- [ ] **Inconsistent Reddit API Usage**
  - Location: `/src/lib/redditApi.ts` and `/src/features/campaigns/services/reddit.ts`
  - Issue: Different Reddit API implementations in main app vs. campaigns feature
  - Impact: Code duplication, inconsistent behavior, and maintenance difficulties
  - Suggestion: Consolidate Reddit API implementations for consistency

- [ ] **No API Rate Limiting Handling in Some Components**
  - Location: `/src/pages/RedditAccounts.tsx` and `/src/lib/redditApi.ts`
  - Issue: Inconsistent rate limiting handling across Reddit API implementations
  - Impact: Potential application failures when hitting Reddit API rate limits
  - Suggestion: Standardize rate limiting detection and backoff strategy across all Reddit API calls

- [ ] **Security Issue with User-Agent in getRedditProfilePic**
  - Location: `/src/pages/RedditAccounts.tsx` (line 119)
  - Issue: Using generic "Mozilla/5.0" User-Agent instead of app-specific one may violate Reddit API terms
  - Impact: Potential for API access revocation by Reddit
  - Suggestion: Use consistent app-specific User-Agent across all API calls

- [ ] **Missing Pagination in Reddit API Fetching**
  - Location: `/src/lib/redditApi.ts` (lines 925-961)
  - Issue: Fetches up to 100 posts at once with no pagination
  - Impact: Excessive memory usage and potential performance issues with large subreddits
  - Suggestion: Implement proper pagination with cursor-based or offset-based approaches

### Token Management
- [ ] **Insufficient Token Refresh Mechanism**
  - Location: `/src/contexts/RedditAccountContext.tsx`
  - Issue: Token refresh handling is not robust and lacks fallback strategy
  - Impact: Failed API calls when tokens expire
  - Suggestion: Implement more robust error handling for token refresh failures and clear error messages

- [ ] **Token Refresh Issues**
  - Location: `/src/features/campaigns/services/scheduler.ts`
  - Issue: Token refresh doesn't properly handle cases where refresh token is invalid
  - Impact: Failed campaign posts when tokens cannot be refreshed
  - Suggestion: Implement proper token validation and fallback mechanisms

- [ ] **Webhook Signature Verification Without Request Replay Protection**
  - Location: `/src/lib/stripe/webhook.ts` (lines 21-32)
  - Issue: The implementation doesn't include timestamp validation to prevent replay attacks
  - Impact: Webhook events could potentially be replayed by attackers
  - Suggestion: Add timestamp validation as part of the webhook verification process

## CODE QUALITY ISSUES

### Type Safety
- [ ] **Unsafe Type Casts**
  - Location: Multiple files
  - Issue: Unsafe type casts using `as any` and double casts
  - Impact: Potential runtime errors and bypassing TypeScript's type safety
  - Suggestion: Use proper type guards and avoid unsafe casts

- [ ] **Missing Type Definitions**
  - Location: `/src/lib/database.types.ts`
  - Issue: Missing many newly added tables like campaign_posts and media_items
  - Impact: Type safety is compromised, leading to potential runtime errors
  - Suggestion: Update type definitions to match all database tables

- [ ] **Inconsistent Type Definitions**
  - Location: Multiple files
  - Issue: Redefinition of interfaces and inconsistent optional properties
  - Impact: Type errors and potential null reference issues
  - Suggestion: Standardize type definitions and ensure consistent usage

### Error Handling
- [ ] **Inconsistent Error Handling**
  - Location: Multiple files
  - Issue: Error reporting and recovery varies between different methods
  - Impact: Unpredictable application behavior when errors occur
  - Suggestion: Standardize error handling patterns across all API methods

- [ ] **Missing Error Boundaries**
  - Location: Various components
  - Issue: No error boundaries to gracefully handle API failures
  - Impact: Entire application can crash when a component fails
  - Suggestion: Add error boundaries around critical components

- [ ] **Swallowed Errors**
  - Location: Multiple files
  - Issue: Try/catch blocks log errors but don't return meaningful error states to the UI
  - Impact: Users not informed of errors, leading to confusion
  - Suggestion: Ensure errors are properly propagated to the UI

### Race Conditions
- [ ] **Multiple Account Refreshes in Single Page Load**
  - Location: `/src/pages/RedditAccounts.tsx` (lines 139-147)
  - Issue: Component triggers multiple account refreshes on initial load
  - Impact: Redundant API calls and potential race conditions
  - Suggestion: Add debouncing or better dependency management in useEffect

- [ ] **Race Conditions in State Updates**
  - Location: Multiple components
  - Issue: Potential race conditions in state updates when multiple operations run concurrently
  - Impact: Unpredictable UI state and potential data inconsistencies
  - Suggestion: Implement proper synchronization for concurrent operations

### Promise Handling
- [ ] **Unhandled Promise Rejections**
  - Location: Multiple files
  - Issue: Missing error handling for Promise rejections
  - Impact: Unhandled exceptions that could crash the application
  - Suggestion: Add proper error handling for all async operations

- [ ] **Missing Cleanup for Async Operations**
  - Location: Multiple components
  - Issue: No cancellation of async operations when components unmount
  - Impact: Memory leaks and potential state updates after unmount
  - Suggestion: Implement proper cleanup in useEffect return functions

### Input Validation
- [ ] **Insufficient Input Validation**
  - Location: Multiple components
  - Issue: Missing or insufficient validation for user inputs
  - Impact: Potential for invalid data and security vulnerabilities
  - Suggestion: Implement comprehensive input validation

- [ ] **Inconsistent URL Validation**
  - Location: Multiple components
  - Issue: Different approaches to URL validation
  - Impact: Potential for invalid URLs to be processed
  - Suggestion: Standardize URL validation across the application

## FEATURE-SPECIFIC ISSUES

### Reddit Account Connection
- [ ] **Missing Loading State in RedditConnectModal**
  - Location: `/src/components/RedditConnectModal.tsx`
  - Issue: No loading state when initiating Reddit connection
  - Impact: Multiple clicks leading to duplicate connection attempts
  - Suggestion: Add a loading state when connecting and disable the button during connection

- [ ] **Minimal Error Handling in OAuth Callback**
  - Location: `/src/pages/RedditOAuthCallback.tsx`
  - Issue: Error handling doesn't provide user guidance for different error scenarios
  - Impact: Poor user experience when authentication fails
  - Suggestion: Add specific error messages and recovery steps for different failure scenarios

- [ ] **Duplicate OAuth Code in Multiple Components**
  - Location: `/src/contexts/RedditAccountContext.tsx` and `/src/pages/RedditAccounts.tsx`
  - Issue: The same OAuth code appears in multiple components
  - Impact: Code duplication and maintenance difficulties
  - Suggestion: Extract OAuth logic to a shared utility function

- [ ] **Inconsistent Avatar Handling**
  - Location: `/src/pages/RedditAccounts.tsx` and `/src/lib/redditApi.ts`
  - Issue: Multiple implementations of Reddit avatar handling with different fallback strategies
  - Impact: Inconsistent user experience and code duplication
  - Suggestion: Standardize avatar handling and fallback approach

### Campaign Management
- [ ] **No Validation of Project Names**
  - Location: Multiple components
  - Issue: Missing validation for project name uniqueness
  - Impact: Potential for duplicate project names and user confusion
  - Suggestion: Add validation for project name uniqueness before form submission

- [ ] **Excessive Component Length**
  - Location: `/src/contexts/CampaignContext.tsx`
  - Issue: Component is extremely long (790 lines) with multiple responsibilities
  - Impact: Difficult to maintain and understand
  - Suggestion: Split into smaller components with focused responsibilities

- [ ] **No Cleanup for Failed Media Uploads**
  - Location: `/src/campaigns/lib/api.ts`
  - Issue: No cleanup of uploaded storage files if database record creation fails
  - Impact: Orphaned files in storage that waste space
  - Suggestion: Implement proper cleanup of storage resources on failure

## UI AND ACCESSIBILITY ISSUES

### UI State Management
- [ ] **Inconsistent State Management**
  - Location: Multiple components
  - Issue: Mix of local component state and global contexts
  - Impact: Unpredictable UI behavior and potential state synchronization issues
  - Suggestion: Standardize state management approach

- [ ] **Modal State Not Reset**
  - Location: Multiple modal components
  - Issue: State not cleared when re-opening modals
  - Impact: Stale data shown to users
  - Suggestion: Ensure modal state is reset on open

- [ ] **Duplicate Components**
  - Location: `/src/pages/SavedList.tsx` and `/src/components/SavedList.tsx`
  - Issue: Similar components with different implementations
  - Impact: Code duplication and inconsistent behavior
  - Suggestion: Consolidate into a single reusable component

### Accessibility
- [ ] **Missing ARIA Attributes**
  - Location: Multiple components
  - Issue: Interactive elements missing proper ARIA attributes
  - Impact: Poor accessibility for users with screen readers
  - Suggestion: Add appropriate ARIA attributes to all interactive elements

- [ ] **Low Contrast Text**
  - Location: Multiple components
  - Issue: Gray text on dark backgrounds with insufficient contrast
  - Impact: Difficult to read for users with visual impairments
  - Suggestion: Ensure all text meets WCAG contrast guidelines

- [ ] **Missing Alt Text for Images**
  - Location: Multiple components
  - Issue: Images without proper alt text
  - Impact: Poor accessibility for users with screen readers
  - Suggestion: Add descriptive alt text to all images

## ARCHITECTURE AND DESIGN ISSUES

### Code Structure
- [ ] **Excessive Component Length**
  - Location: Multiple components (Calendar.tsx, Analytics.tsx, etc.)
  - Issue: Components are too long and have multiple responsibilities
  - Impact: Difficult to maintain and understand
  - Suggestion: Split into smaller components with focused responsibilities

- [ ] **Duplicate Utility Functions**
  - Location: Multiple files
  - Issue: Similar utility functions duplicated across multiple files
  - Impact: Code duplication and maintenance difficulties
  - Suggestion: Extract common utilities to shared files

- [ ] **Inconsistent Feature Organization**
  - Location: Codebase structure
  - Issue: Inconsistent organization between feature folders
  - Impact: Difficult to navigate and understand the codebase
  - Suggestion: Standardize feature organization patterns

### Environment Configuration
- [ ] **Hardcoded Credentials**
  - Location: Multiple files
  - Issue: Hard-coded API keys, client IDs, and secrets
  - Impact: Security vulnerabilities and difficulty changing environments
  - Suggestion: Move all credentials to environment variables

- [ ] **Inconsistent Environment Variable Access**
  - Location: Multiple files
  - Issue: Different approaches to accessing environment variables
  - Impact: Difficult to track and manage environment configuration
  - Suggestion: Standardize environment variable access patterns

### Database Design
- [ ] **Missing Foreign Key Constraints**
  - Location: Database schema
  - Issue: Some tables missing proper foreign key constraints
  - Impact: Potential data integrity issues
  - Suggestion: Add appropriate foreign key constraints to all related tables

- [ ] **Inconsistent Naming Conventions**
  - Location: Database schema
  - Issue: Inconsistent table and column naming
  - Impact: Confusion and difficulty understanding the database structure
  - Suggestion: Standardize naming conventions across all tables