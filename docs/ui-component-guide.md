# UI Component Guide

This document provides guidance on using the standardized UI components in the SubPirate application. Following these guidelines ensures a consistent user experience across the application.

## Button Component

All buttons should use the standardized button component with appropriate color schemes:

### Primary Button (Green)
- Color: `#2B543A` (base), `#1F3C2A` (hover)
- Used for primary actions (save, submit, create)
- Example usage:
  ```tsx
  <button 
    className="bg-[#2B543A] hover:bg-[#1F3C2A] text-white font-medium py-2 px-4 rounded"
    onClick={handleSave}
  >
    Save to Project
  </button>
  ```

### Secondary Button (Gray)
- Color: Tailwind's `gray-500` (base), `gray-600` (hover)
- Used for secondary actions (cancel, back)
- Example usage:
  ```tsx
  <button 
    className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded"
    onClick={handleCancel}
  >
    Cancel
  </button>
  ```

### Danger Button (Red)
- Color: Tailwind's `red-500` (base), `red-600` (hover)
- Used for destructive actions (delete, remove)
- Example usage:
  ```tsx
  <button 
    className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded"
    onClick={handleDelete}
  >
    Delete
  </button>
  ```

## Error Message Component

Use the standardized error message component to display validation errors and API errors:

```tsx
import ErrorMessage from '../components/ui/error-message';

// Usage with simple string
<ErrorMessage message="Invalid username format" />

// Usage with Supabase or API error
<ErrorMessage message={error.message} />
```

### Features
- Consistent red styling
- Clear message formatting
- Proper spacing and padding
- Accessible to screen readers

## Success Message Component

Use the standardized success message component to provide positive feedback:

```tsx
import SuccessMessage from '../components/ui/success-message';

// Usage
<SuccessMessage message="Project created successfully!" />
```

### Features
- Consistent green styling
- Clear message formatting
- Proper spacing and padding
- Accessible to screen readers

## Form Validation

Use the standardized validation utilities for consistent form validation:

```tsx
import { validateEmail, validateUsername, validateUrl } from '../lib/validation';

// Example usage
const handleSubmit = () => {
  if (!validateEmail(email)) {
    setError('Please enter a valid email address');
    return;
  }
  
  // Continue with form submission
};
```

### Available Validators
- `validateEmail(email: string): boolean`
- `validateUsername(username: string): boolean`
- `validateUrl(url: string): boolean`
- `validateRequired(value: string): boolean`
- `validateLength(value: string, min: number, max: number): boolean`

## Card Component

Cards are used to group related content:

```tsx
import { Card } from '../components/ui/card';

// Usage
<Card>
  <h3 className="text-lg font-semibold">Card Title</h3>
  <p>Card content goes here...</p>
</Card>
```

### Variants
- Default: Standard card with shadow
- Flat: Card without shadow
- Outlined: Card with border instead of shadow

## Input Styling

All inputs should follow these guidelines:

```tsx
<input
  type="text"
  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2B543A] focus:border-transparent"
  placeholder="Enter text here"
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
/>
```

### Focus States
- Focus ring color: `#2B543A` (same as primary button)
- Focus ring width: 2px
- Border becomes transparent on focus

## Error Handling Best Practices

### Database Errors
Use proper type guards and interfaces for handling database errors:

```tsx
import { isSupabaseError } from '../lib/supabase.types';

try {
  const { data, error } = await supabase.from('projects').insert(projectData);
  
  if (error) {
    if (isSupabaseError(error)) {
      // Handle Supabase-specific error
      setError(`Database error: ${error.message}`);
    } else {
      // Handle generic error
      setError('An unknown error occurred');
    }
  }
} catch (err) {
  console.error('Unexpected error:', err);
  setError('An unexpected error occurred');
}
```

### API Errors
Handle API errors consistently:

```tsx
try {
  const response = await fetch('/api/endpoint');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
} catch (err) {
  setError(err.message || 'Failed to fetch data');
}
```

## Code Splitting Best Practices

Use React.lazy and Suspense to improve performance:

```tsx
import React, { Suspense } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

// Lazy-loaded component
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function MyComponent() {
  return (
    <div>
      <h1>My Component</h1>
      <Suspense fallback={<LoadingSpinner />}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
}
```

## Accessibility Guidelines

- All interactive elements must be keyboard accessible
- Use semantic HTML elements (`button` for buttons, `a` for links)
- Provide adequate color contrast (AA standard minimum)
- Include descriptive labels for form elements
- Ensure error messages are linked to their corresponding inputs