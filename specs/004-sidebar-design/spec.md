# Feature Specification: Sidebar Navigation with Design Language Update

**Feature Branch**: `004-sidebar-design`  
**Created**: December 23, 2025  
**Status**: Draft  
**Input**: User description: "Update the design of the app to follow the design language from the provided image. Add a sidebar that displays queued folders. Hide the sidebar on small screens."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Between Folders via Sidebar (Priority: P1)

Users can view all available folders in a permanent sidebar and switch between them with a single click, making folder navigation more efficient than the current sequential queue approach.

**Why this priority**: This is the core value proposition - transforming navigation from linear (skip-through) to direct access. Users with many folders benefit immediately from being able to jump to any folder of interest.

**Independent Test**: Can be fully tested by creating multiple folders with unread articles, clicking on different folder names in the sidebar, and verifying the main content area updates to show the selected folder's articles. Delivers immediate navigation value without requiring other stories.

**Acceptance Scenarios**:

1. **Given** user is viewing the timeline with multiple folders, **When** user clicks on a folder name in the sidebar, **Then** the main content area displays that folder's articles and the folder is highlighted in the sidebar
2. **Given** user is viewing a folder, **When** user clicks on another folder in the sidebar, **Then** the view switches to the new folder without page reload
3. **Given** user clicks on "All" in the sidebar, **When** the view loads, **Then** all unread articles from all folders are displayed in chronological order

---

### User Story 2 - Visual Feedback for Folder Status (Priority: P2)

Users can see at a glance which folders have unread articles and how many, enabling them to prioritize their reading based on volume and topic.

**Why this priority**: Enhances the navigation experience by providing context. Users can decide which folder to read based on unread counts, but the basic navigation (P1) works without this.

**Independent Test**: Can be tested by creating folders with varying numbers of unread articles and verifying that each folder displays its unread count as a badge. Delivers information density value independently.

**Acceptance Scenarios**:

1. **Given** a folder has unread articles, **When** sidebar is displayed, **Then** the folder shows a badge with the count of unread articles
2. **Given** user marks all articles in a folder as read, **When** sidebar updates, **Then** the folder's unread count badge is removed or shows "0"
3. **Given** multiple folders exist, **When** viewing sidebar, **Then** folders are ordered by priority or unread count for easy scanning

---

### User Story 3 - Responsive Sidebar Behavior (Priority: P3)

Users on mobile devices or small screens can access all folder navigation features through a collapsible sidebar, maintaining full functionality while preserving screen real estate for content.

**Why this priority**: Extends the feature to all screen sizes. Desktop users get full value from P1/P2, making this an enhancement rather than a core requirement for initial delivery.

**Independent Test**: Can be tested by resizing the browser window or using mobile device emulation to verify the sidebar collapses into a hamburger menu on small screens and can be toggled open/closed. Delivers mobile-friendly value independently.

**Acceptance Scenarios**:

1. **Given** viewport width is below 768px, **When** page loads, **Then** sidebar is hidden by default and a hamburger menu icon is visible
2. **Given** sidebar is hidden on mobile, **When** user taps the hamburger icon, **Then** sidebar slides in from the left and overlays the content
3. **Given** sidebar is open on mobile, **When** user taps outside the sidebar or on a folder, **Then** sidebar closes automatically
4. **Given** viewport is resized from mobile to desktop width, **When** resize completes, **Then** sidebar becomes permanently visible without manual toggle

---

### User Story 4 - Updated Visual Design Language (Priority: P2)

The application adopts a modern, dark-theme design with consistent spacing, typography, and visual hierarchy matching contemporary RSS reader applications.

**Why this priority**: Improves aesthetic appeal and usability but doesn't block core functionality. Can be implemented in parallel with navigation features or separately.

**Independent Test**: Can be tested using visual regression tests that compare screenshots before/after design updates, and by manually verifying design tokens (colors, spacing, border radius) match the reference design. Delivers visual polish independently.

**Acceptance Scenarios**:

1. **Given** user loads any page, **When** viewing the interface, **Then** all components use the new dark color palette with proper contrast ratios
2. **Given** user interacts with buttons and links, **When** hovering or focusing, **Then** interactive states use consistent hover/focus treatments
3. **Given** user views articles in a folder, **When** articles are displayed, **Then** cards have rounded corners, subtle borders, and consistent spacing
4. **Given** user expands an article, **When** full content is shown, **Then** expand/collapse animation is smooth and content is properly formatted

---

### Edge Cases

- **Empty folders**: What happens when a folder has no unread articles? Should it still appear in the sidebar or be hidden/grayed out?
  - *Answer: Empty folders should remain visible in the sidebar but without an unread count badge, allowing users to access read articles if needed*

- **Very long folder names**: How does the sidebar handle folders with names exceeding the available width?
  - *Answer: Folder names should truncate with ellipsis and show full name on hover/tooltip*

- **Large number of folders**: How does the sidebar handle users with 20+ folders?
  - *Answer: Sidebar should become scrollable while keeping navigation controls (All, Settings, About) fixed at top/bottom*

- **Network errors during folder switch**: What happens when switching folders fails due to connectivity issues?
  - *Answer: Show error message and keep previous folder selected; retry mechanism for failed requests*

- **Sidebar state persistence**: Should the sidebar remember its open/closed state across page reloads on mobile?
  - *Answer: Yes, use localStorage to remember user preference for sidebar visibility*

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a vertical sidebar on the left side of the screen containing all available folders
- **FR-002**: System MUST allow users to click on any folder in the sidebar to navigate directly to that folder's articles
- **FR-003**: System MUST highlight the currently active folder in the sidebar with a distinct visual treatment
- **FR-004**: System MUST display an unread count badge next to each folder name showing the number of unread articles
- **FR-005**: System MUST update unread counts in real-time when articles are marked as read or when new articles arrive
- **FR-006**: System MUST include an "All" option at the top of the sidebar to view all articles across folders
- **FR-007**: System MUST hide the sidebar on viewports narrower than 768px and provide a toggle button (hamburger menu)
- **FR-008**: System MUST allow users to open/close the sidebar on mobile devices via the hamburger menu
- **FR-009**: System MUST close the mobile sidebar automatically when user selects a folder or taps outside the sidebar
- **FR-010**: System MUST preserve the current folder view when marking articles as read
- **FR-011**: System MUST apply new design tokens including dark theme colors, rounded corners, and consistent spacing to all UI components
- **FR-012**: System MUST maintain keyboard accessibility for all sidebar navigation actions (Tab, Enter, Escape)
- **FR-013**: System MUST show tooltips for truncated folder names on hover
- **FR-014**: System MUST make the sidebar scrollable when folder list exceeds viewport height
- **FR-015**: System MUST keep navigation controls (All, Settings, About) accessible even when folder list is scrolling

### Key Entities

- **Folder**: Represents a category/collection of RSS feeds with properties including:
  - Name (user-visible label)
  - Unread count (number of unread articles)
  - Active state (whether currently selected)
  - Priority/order (for sorting in sidebar)
  
- **Sidebar State**: Represents the sidebar's display state with properties including:
  - Visibility (open/closed on mobile)
  - User preference (persisted in localStorage)
  - Responsive mode (mobile vs desktop)

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: 
  - Design tokens will include dark theme palette (background: #1a1a1a, surface: #2d2d2d, primary: #3b82f6, text: #e5e5e5)
  - Spacing scale: 4px base unit (spacing-1 through spacing-6: 4px, 8px, 12px, 16px, 24px, 32px)
  - Typography: System font stack with font sizes 14px (body), 16px (headings), 12px (captions)
  - Border radius: 8px for cards, 6px for buttons
  - WCAG 2.1 AA compliance validated via axe DevTools for color contrast (minimum 4.5:1 for normal text) and keyboard navigation tested for all interactive elements

- **Responsive Behavior**: 
  - Breakpoints: Mobile (<768px), Desktop (≥768px)
  - Mobile: Sidebar hidden by default, hamburger menu visible, sidebar overlays content when opened
  - Desktop: Sidebar permanently visible, takes up ~240px of left side, main content area adjusts
  - Tablet (768px-1024px): Full sidebar visible but narrower (~200px)
  - Wide desktop (>1440px): Sidebar remains fixed width, content area expands

- **Visual Regression Proof**: 
  - Playwright visual regression tests will capture screenshots of:
    - Desktop view with sidebar showing multiple folders
    - Mobile view with sidebar closed and open states  
    - Article list in new design
    - Hover/focus states for sidebar items
  - Percy integration for automated visual diffs on pull requests
  - Manual design review checklist comparing against reference image

- **Data Loading Strategy**: 
  - Initial folder list and unread counts loaded during static generation from RSS feed metadata
  - Real-time unread count updates use optimistic UI updates (immediate visual feedback) with background sync
  - Lazy load article content only when folder is selected
  - Prefetch next folder in queue on hover for faster perceived performance
  - Maximum 100KB initial bundle size impact from new sidebar component

- **Static Build Strategy**: 
  - Folder structure and initial unread counts sourced from \`getStaticProps\` during build
  - Sidebar component statically rendered with all folders visible (hydrated as interactive on client)
  - Mobile/desktop detection done client-side via CSS media queries and React hydration
  - Sidebar state (open/closed) stored in localStorage, defaults to closed on mobile on first visit
  - \`npm run build && npm run export\` generates static files with pre-rendered sidebar markup

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to any folder within 1 click (vs current multi-click skip pattern), reducing average folder access time by 70%
- **SC-002**: Sidebar renders and becomes interactive within 100ms of page load on 3G connection
- **SC-003**: 95% of users successfully navigate between folders using sidebar on first attempt (measured via analytics)
- **SC-004**: Visual regression tests pass with 0 unexpected pixel differences in core UI components
- **SC-005**: Mobile sidebar opens/closes within 200ms with smooth animation (60fps)
- **SC-006**: All interactive elements in sidebar achieve WCAG 2.1 AA compliance (4.5:1 contrast ratio minimum)
- **SC-007**: Users can access any folder via keyboard navigation alone (Tab + Enter) within 5 keystrokes
- **SC-008**: Sidebar remains functional with up to 50 folders without performance degradation (<16ms frame time)
- **SC-009**: 80% of users report improved navigation experience in post-implementation survey
- **SC-010**: Page layout does not break or show horizontal scroll on any screen size from 320px to 2560px width

## Assumptions

1. **Existing folder data structure**: Assuming folder objects already exist in the application state with name and unread count properties
2. **Design tokens framework**: Assuming the application will use CSS variables or a similar token system for consistent theming
3. **Mobile-first responsive framework**: Assuming Tailwind CSS or similar utility framework is available for responsive design
4. **Navigation state management**: Assuming application has a state management solution (React Context/Redux) for tracking active folder
5. **Static generation support**: Assuming Next.js static export capabilities are already configured and working
6. **Browser support**: Targeting modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) with CSS Grid and Flexbox support
7. **Icon library**: Assuming access to icon set for hamburger menu, folder icons, and navigation elements
8. **Animation framework**: Assuming CSS transitions or Framer Motion available for sidebar animations

## Dependencies

- **Existing Features**: Depends on folder queue system from 003-timeline-folder-view
- **Design Assets**: Requires reference design image and any associated design system documentation
- **Testing Infrastructure**: Requires Playwright visual regression testing setup
- **Build Process**: Requires Next.js static export functionality to be working

## Out of Scope

- Folder creation, deletion, or renaming functionality (remains unchanged)
- Drag-and-drop folder reordering in sidebar (future enhancement)
- Folder filtering or search within sidebar (future enhancement)
- Multi-folder selection or bulk operations (future enhancement)
- Customizable sidebar width or position (future enhancement)
- Dark/light theme toggle (only dark theme implemented per reference design)
- Folder grouping or nested folder hierarchies (future enhancement)
