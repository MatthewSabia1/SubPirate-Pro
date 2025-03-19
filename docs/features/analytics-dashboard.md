# Analytics Dashboard

The Analytics Dashboard provides visual insights into Reddit data and user activity.

## Overview

The Analytics feature includes:
- Activity heatmap visualization
- Post performance metrics
- Engagement tracking
- Subreddit growth metrics
- Custom tracking for higher-tier subscriptions

## Architecture

### Components

- **Analytics Page**: `/src/pages/Analytics.tsx`
  - Main container for analytics views
  - Handles data fetching and state management

- **HeatmapChart**: `/src/components/HeatmapChart.tsx`
  - Visualizes posting activity over time
  - Shows optimal posting times

- **Charts and Visualizations**:
  - Built using Chart.js and React-ChartJS-2
  - Custom styling for dark theme

### Database Schema

```sql
analytics_events {
  id: string (primary key)
  user_id: string (foreign key to profiles)
  event_type: string
  event_data: Json
  created_at: string (timestamp)
}

post_analytics {
  id: string (primary key)
  post_id: string
  subreddit: string
  views: number
  upvotes: number
  comments: number
  created_at: string (timestamp)
  updated_at: string (timestamp)
}

subreddit_metrics {
  id: string (primary key)
  subreddit_id: string (foreign key to subreddits)
  date: string (timestamp)
  subscribers: number
  active_users: number
  posts_count: number
  engagement_rate: number
  created_at: string (timestamp)
}

user_activity {
  id: string (primary key)
  user_id: string (foreign key to profiles)
  activity_type: string
  activity_data: Json
  created_at: string (timestamp)
}
```

## Features

### Heatmap Visualization

The heatmap shows Reddit activity patterns:

```typescript
// In HeatmapChart.tsx
const HeatmapChart = ({ data }) => {
  // Configure Chart.js options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.raw} posts`;
          }
        }
      },
      // Additional configuration...
    },
    scales: {
      // Scale configuration...
    }
  };

  // Render heatmap chart
  return (
    <div className="h-[400px]">
      <Chart 
        type="heatmap"
        data={data}
        options={options}
      />
    </div>
  );
};
```

### Engagement Metrics

The system tracks and displays various engagement metrics:

1. **Post Performance**:
   - Views, upvotes, and comments over time
   - Comparative analysis against similar posts
   - Engagement rate calculation

2. **Subreddit Growth**:
   - Subscriber growth trends
   - Active user fluctuations
   - Posting activity patterns

3. **User Activity**:
   - Analysis frequency
   - Saved subreddits interaction
   - Project management activity

## Data Collection

Analytics data is collected through:

1. **Direct API Calls**: Fetching data from Reddit API
   ```typescript
   const subredditInfo = await redditApi.getSubredditInfo(subreddit);
   ```

2. **Event Tracking**: Logging user interactions
   ```typescript
   await supabase.from('analytics_events').insert({
     user_id: auth.user.id,
     event_type: 'view_analysis',
     event_data: { subreddit }
   });
   ```

3. **Periodic Jobs**: Scheduled background tasks for data refreshing
   ```typescript
   // Example of a background job
   async function refreshSubredditMetrics() {
     // Fetch and store updated metrics
   }
   ```

## Feature Gating

Advanced analytics are gated based on subscription tier:

```typescript
// From src/lib/subscription/features.ts
TIER_FEATURES.creator: [
  // ...other features
  FEATURE_KEYS.ADVANCED_ANALYTICS,
  // ...other features
],
```

Usage in components:

```jsx
<FeatureGate 
  feature={FEATURE_KEYS.ADVANCED_ANALYTICS}
  fallback={<BasicAnalyticsView />}
>
  <AdvancedAnalyticsView />
</FeatureGate>
```

## Data Visualization

The application uses Chart.js for data visualization:

```typescript
// Example of creating a line chart for growth metrics
const LineChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => format(new Date(d.date), 'MMM d')),
    datasets: [
      {
        label: 'Subscribers',
        data: data.map(d => d.subscribers),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Active Users',
        data: data.map(d => d.active_users),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.3,
      }
    ]
  };
  
  return <Line data={chartData} options={options} />;
};
```

## Data Export

Higher-tier subscriptions have access to data export capabilities:

```typescript
// Example of exporting analytics data
const exportData = async (format: 'csv' | 'json') => {
  const { data } = await supabase
    .from('analytics_view')
    .select('*')
    .eq('user_id', auth.user.id);
    
  if (format === 'csv') {
    return convertToCSV(data);
  }
  
  return JSON.stringify(data, null, 2);
};
```

## Custom Tracking

Pro and Agency tiers have access to custom tracking:

```typescript
// Setting up custom tracking
const setupCustomTracking = async (config) => {
  await supabase.from('tracking_configurations').insert({
    user_id: auth.user.id,
    name: config.name,
    metrics: config.metrics,
    frequency: config.frequency,
    notification_settings: config.notifications
  });
};
```

## Error Handling

The Analytics system implements comprehensive error handling:

- Data loading failures with fallback UI
- Chart rendering errors with graceful degradation
- Missing data handling with appropriate UI messaging
- Offline mode support with cached data

## Future Enhancements

- AI-powered trend predictions
- Competitive analysis of similar subreddits
- Custom dashboard layouts and widgets
- Automated reporting and scheduling
- Advanced filtering and segmentation
- Real-time analytics updates