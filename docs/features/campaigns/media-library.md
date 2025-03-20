# Media Library

The Media Library is a powerful feature for managing media assets used in your Reddit campaigns. It provides an organized way to upload, browse, search, filter, and manage all your campaign media in one place.

## Key Features

### Multiple View Options
- **Grid View**: Default view that displays media as a visual grid of thumbnails
- **List View**: Displays media in a compact list format with essential details
- **Table View**: Shows a detailed tabular view with all media properties

### Search and Filter Capabilities
- **Text Search**: Quickly find media by filename
- **File Type Filtering**: Filter by image type (JPEG, PNG, GIF, etc.)
- **Date Range Filtering**: Show media uploaded within specific time frames
- **Sorting Options**: Sort by newest, oldest, name, or file size

### Media Management
- **Single Media Upload**: Upload individual images up to 5MB in size
- **Preview**: View full-size media in a modal with detailed information
- **Download**: Download original media files directly
- **Delete**: Remove unwanted media items individually

### Bulk Operations
- **Multi-Select Mode**: Select multiple media items for batch operations
- **Bulk Delete**: Remove multiple items at once
- **Select All**: One-click selection of all filtered items

### Interactive UI Elements
- **Hover Previews**: Information and quick actions displayed on hover
- **Visual Indicators**: Clear indicators for selection state
- **Responsive Design**: Optimized for both desktop and mobile devices

## Accessing the Media Library

The Media Library can be accessed through several entry points:

1. **Sidebar Navigation**: Direct link in the main application sidebar
2. **Campaigns Page**: "Media Library" button in the top action bar
3. **Campaign Detail Page**: "Media Library" button in the campaign actions
4. **Media Card**: Link from the dashboard media stats card

## User Interface

### Toolbar

The Media Library toolbar provides these controls:

- **View Switcher**: Toggle between grid, list, and table views
- **Selection Mode**: Enter bulk selection mode to select multiple items
- **Search Bar**: Filter media by filename
- **Filter Button**: Access advanced filtering options

### Filter Options

When the filter panel is expanded, these options are available:

| Filter | Description | Options |
|--------|-------------|---------|
| File Type | Filter by media format | All Types, All Images, JPEG, PNG, GIF |
| Date Range | Filter by upload date | All Time, Today, Last 7 Days, Last 30 Days |
| Sort By | Order results | Newest First, Oldest First, Name (A-Z), Size (Largest First) |

### View Modes

#### Grid View
- Visual layout with image thumbnails
- Media information displayed on hover
- Quick actions for view, select, download, and delete
- Selection checkbox appears in the top-left corner when in selection mode

#### List View
- Compact row layout with thumbnails and basic details
- Shows filename, size, and upload date
- Action buttons for view, download, and delete
- Selection checkbox appears at the start of each row in selection mode

#### Table View
- Detailed tabular layout with all metadata
- Sortable columns for organized viewing
- Full details including file type and exact upload date
- Checkboxes for easy selection and bulk operations

## User Workflows

### Uploading Media

1. Click the "Upload Media" button in the top-right corner
2. Select an image file (JPG, PNG, GIF, WebP) from your device
3. The file will be validated and uploaded with a progress indicator
4. Once complete, the new media item appears in your library

### Searching for Media

1. Use the search bar in the toolbar to enter search terms
2. Results filter in real-time as you type
3. Clear the search or use the "Reset Filters" button to show all items

### Filtering and Sorting

1. Click the filter icon to expand the filter panel
2. Select desired filters for file type and date range
3. Choose a sort order from the "Sort By" dropdown
4. Apply filters to see matching results
5. Use "Reset Filters" to clear all filters at once

### Selecting and Bulk Actions

1. Click the "Select" button to enter selection mode
2. Check the boxes for items you want to select
3. Use bulk action buttons (like "Delete") that appear in the toolbar
4. Confirm the bulk action when prompted
5. Exit selection mode using the "X" button

### Viewing Media Details

1. Click on any media item or its "View" button
2. A modal opens showing the full-size image
3. View detailed information in the bottom panel
4. Use the download or delete buttons as needed
5. Close the preview with the "X" button or by clicking outside

## Technical Details

### Media Item Properties

Each media item includes the following metadata:

- **Filename**: Original name of the uploaded file
- **File Size**: Size of the file in bytes (displayed in KB)
- **Media Type**: MIME type of the file (e.g., image/jpeg)
- **Upload Date**: When the file was added to the library
- **URL**: Direct access URL for the file
- **Storage Path**: Internal path in the storage system
- **User ID**: ID of the user who owns the media

### Storage Integration

The Media Library interfaces with Supabase storage:

1. Files are stored in the 'campaign-media' bucket
2. Each file has a unique identifier to prevent collisions
3. Original file extensions are preserved
4. File size is limited to 5MB per upload
5. Only image file types are accepted (JPG, PNG, GIF, WebP)

For more details on storage configuration, see [Storage Setup](./storage-setup.md).

## Best Practices

- **Consistent Naming**: Use descriptive filenames for easier search and organization
- **Regular Cleanup**: Periodically remove unused media to keep your library organized
- **Optimization**: Compress images before uploading for better performance
- **Formats**: Use JPEG for photos, PNG for graphics with transparency, and GIF for simple animations
- **Categorization**: Use the filter system to quickly find related media

## Troubleshooting

| Issue | Possible Solution |
|-------|------------------|
| Upload fails | Check file size (max 5MB) and format (must be an image) |
| Media not appearing | Try refreshing the page or clearing filters |
| Search not working | Ensure spelling is correct and remove special characters |
| Slow loading | Try switching to list view for faster performance with large libraries |
| Can't delete | Check your permissions or try refreshing your session |

## Security and Privacy

- Media items are securely stored in Supabase
- Row-level security ensures users can only access their own media
- Media URLs are publicly accessible but difficult to guess
- File validation prevents uploading of potentially harmful files
- All upload and management actions are protected by authentication 