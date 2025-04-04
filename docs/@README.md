# SubPirate

A comprehensive Reddit marketing analysis tool that helps users discover, analyze, and manage marketing opportunities across different subreddits.

## Recent Updates

### Production Readiness Enhancements
- Standardized button styling and UI components
- Improved performance with code splitting and bundle optimization
- Enhanced error handling with TypeScript interfaces
- Fixed RLS policies for better database security
- Standardized form validation and error messaging
- Fixed saved subreddit list analysis display issues
- Improved data validation and error recovery

### NSFW Content Support
- Full support for all Reddit content types
- Enhanced image handling system
- No content filtering
- Improved fallback system for thumbnails and previews

### Image Loading System
- Progressive image loading with multiple fallbacks
- Support for Reddit's special thumbnail values
- Enhanced error handling and recovery
- Automatic placeholder generation

### Calendar Improvements
- Better post display in calendar view
- Enhanced modal image handling
- Improved post details fetching
- Comprehensive error logging

## Features

### Content Display
- Display all Reddit content types without filtering
- Robust image loading with multiple fallbacks
- Support for NSFW content and thumbnails
- Comprehensive error handling

### Calendar View
- View and manage Reddit posts
- Multiple view options (month, week, day)
- Post filtering and sorting
- Detailed post information

### Project Management
- Organize marketing campaigns
- Team collaboration
- Performance tracking
- Content planning

## Technical Details

### Stripe Integration
- Complete subscription management system with tiered pricing
- Automatic product/price synchronization between Stripe and Supabase
- Client-side caching with server validation for performance
- Webhook processing with replay protection
- Feature access control based on subscription level
- See [Stripe Integration Guide](./STRIPE-INTEGRATION-GUIDE.md) for complete details

### UI Component System
- Standardized button styling with consistent color scheme
- Reusable error and success message components
- Consistent input validation and styling

### Performance Optimization
```typescript
// Code splitting implementation with React.lazy and Suspense
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Projects = React.lazy(() => import('./pages/Projects'));

// Main application with Suspense boundaries
<React.Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/projects" element={<Projects />} />
  </Routes>
</React.Suspense>
```

### Error Handling
```typescript
// Type-safe error handling with interfaces
interface SupabaseError {
  code: string;
  message: string;
  details?: string;
}

// Type guard function
function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}
```

### Image Handling
```typescript
// Image loading priority
1. High-quality preview image
2. Thumbnail
3. Media embed thumbnail
4. Generated placeholder
```

### Error Recovery
```typescript
// Progressive fallback system
1. Try primary image source
2. Attempt fallback sources
3. Use generated placeholder
4. Log errors for debugging
```

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/subpirate.git
```

2. Install dependencies
```bash
cd subpirate
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

## Configuration

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_REDDIT_APP_ID=your_reddit_app_id
VITE_REDDIT_APP_SECRET=your_reddit_app_secret
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Reddit API Setup
1. Create a Reddit application at https://www.reddit.com/prefs/apps
2. Set up OAuth2 credentials
3. Configure redirect URI

## Development

### Running Tests
```bash
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
```

### Building for Production
```bash
npm run build       # Includes TypeScript checks
```

### Linting
```bash
npm run lint        # ESLint with modern config
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers directly.

## Acknowledgments

- Reddit API for providing the data
- Supabase for backend services
- OpenRouter AI for analysis capabilities
- Stripe for payment processing