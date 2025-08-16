# Retro AI UI Design Guide

Single source of truth for all UI/UX decisions. When updated, Claude Code references this to maintain consistency.

## Table of Contents
1. [Design Principles](#design-principles)
2. [Design Tokens](#design-tokens)
3. [Typography](#typography)
4. [Color System](#color-system)
5. [Components](#components)
6. [Claude Code Guidelines](#claude-code-guidelines)
7. [Accessibility](#accessibility)

## Design Principles

### Core Values
- **Clarity**: Immediately understandable interface elements
- **Consistency**: Similar elements look and behave similarly
- **Efficiency**: Easy to accomplish common tasks
- **Accessibility**: Design for all users
- **Responsiveness**: Seamless across all device sizes

### Visual Hierarchy
1. Use size, color, spacing to establish importance
2. Group related elements
3. Provide clear visual paths
4. Ensure adequate contrast

## Design Tokens

All tokens in `styles/design-tokens.css`:

### Colors
```css
/* Primary - Soft Blues */
--color-primary-50: #f0f9ff;
--color-primary-500: #0ea5e9;
--color-primary-900: #0c4a6e;

/* Neutrals */
--color-gray-50: #fafafa;
--color-gray-500: #737373;
--color-gray-900: #171717;

/* Semantic */
--color-success-500: #10b981;
--color-warning-500: #f59e0b;
--color-error-500: #ef4444;
```

### Spacing & Layout
```css
--spacing-xs: 0.25rem;  /* 4px */
--spacing-sm: 0.5rem;   /* 8px */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 1.5rem;   /* 24px */
--spacing-xl: 2rem;     /* 32px */

--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
```

## Typography

### Font Stack
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Type Scale
| Size | Usage |
|------|-------|
| text-xs (12px) | Small labels, helper text |
| text-sm (14px) | Body text, form labels |
| text-base (16px) | Default body text |
| text-lg (18px) | Large body text |
| text-xl (20px) | Section headings |
| text-2xl (24px) | Page headings |
| text-3xl (30px) | Major headings |

### Font Weights
- `font-normal` (400): Body text
- `font-medium` (500): Emphasized text
- `font-semibold` (600): Headings, buttons
- `font-bold` (700): Strong emphasis

## Color System

### Primary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| primary-50 | #f0f9ff | Light backgrounds |
| primary-500 | #0ea5e9 | Primary actions, links |
| primary-600 | #0284c7 | Hover states |
| primary-900 | #0c4a6e | Dark text/backgrounds |

### Neutral Colors
| Token | Hex | Usage |
|-------|-----|-------|
| gray-50 | #fafafa | Light backgrounds |
| gray-200 | #e5e5e5 | Borders |
| gray-500 | #737373 | Secondary text |
| gray-900 | #171717 | Primary text |

## Components

### Buttons
```jsx
// Primary
<button className="px-4 py-2 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors">
  Primary
</button>

// Secondary
<button className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
  Secondary
</button>

// Ghost
<button className="px-4 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
  Ghost
</button>
```

### Form Elements
```jsx
// Input
<input 
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
  placeholder="Enter text..."
/>

// Select
<select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
  <option>Select option</option>
</select>
```

### Cards
```jsx
<div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-gray-600">Card content</p>
</div>
```

### Modals
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
    <h2 className="text-xl font-semibold mb-4">Modal Title</h2>
    <p className="text-gray-600 mb-6">Content goes here</p>
    <div className="flex gap-3 justify-end">
      <button className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Cancel</button>
      <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Confirm</button>
    </div>
  </div>
</div>
```

## Claude Code Guidelines

### Component Creation Rules
1. **Check existing patterns** in this guide first
2. **Use design tokens** - never hardcode values
3. **Include all states**: hover, focus, active, disabled
4. **Responsive by default**
5. **Semantic HTML**

### Component Template
```jsx
interface ComponentProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Component({ variant = 'primary', size = 'md', className, ...props }: ComponentProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-colors';
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-lg'
  };
  
  return (
    <div className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`} {...props}>
      {children}
    </div>
  );
}
```

### Naming Conventions
- **Files**: kebab-case (`button-group.tsx`)
- **Components**: PascalCase (`ButtonGroup`)
- **Props**: camelCase (`isDisabled`)
- **Booleans**: is/has prefix (`isLoading`, `hasError`)

### Common Patterns
```jsx
// Responsive
<div className="text-sm md:text-base lg:text-lg">

// Conditional styling
<button className={`base-styles ${isActive ? 'active-styles' : ''}`}>

// Component composition
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

### State Management
```jsx
// Loading
if (isLoading) {
  return <div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4"></div></div>;
}

// Error
if (error) {
  return (
    <div className="border border-error-300 bg-error-50 text-error-700 px-4 py-3 rounded-lg">
      {error.message}
    </div>
  );
}
```

## Accessibility

### Requirements
- ARIA labels on interactive elements
- Alt text on images
- Labels on form inputs
- Semantic HTML elements
- Keyboard navigation support
- Focus indicators: `focus:ring-2 focus:ring-primary-500`

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum

### Keyboard Navigation
- Logical focus order
- Skip links for repetitive content
- All interactive elements accessible via keyboard

---

**Keep this guide updated when making design system changes. Claude Code references this for consistency.**