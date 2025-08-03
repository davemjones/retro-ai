# Retro AI Design System

## Overview
Comprehensive design system for consistent, accessible interfaces. Provides design tokens, component patterns, and guidelines.

## Quick Start

### Design Tokens
All properties defined in `styles/design-tokens.css`:
```css
.component {
  color: var(--color-primary-500);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
```

### Main Guide
Complete documentation: `/docs/UI-DESIGN-GUIDE.md`
- Design principles and values
- Complete token reference
- Component patterns and examples
- Accessibility requirements

### Examples
Live examples: `/components/ui-examples.tsx`

## Key Files

| File | Purpose |
|------|---------|
| `/docs/UI-DESIGN-GUIDE.md` | Main design system documentation |
| `/styles/design-tokens.css` | CSS custom properties |
| `/app/globals.css` | Global styles and Tailwind config |
| `/components/ui-examples.tsx` | Example implementations |

## Design Tokens

### Colors
- **Primary**: Soft blue palette for actions and brand
- **Neutral**: Gray scale for text, borders, backgrounds
- **Semantic**: Success, warning, error, info states

### Typography
- **Fonts**: System fonts for performance
- **Scale**: 9 sizes (text-xs to text-5xl)
- **Weights**: 100-900

### Spacing & Layout
- **Scale**: 0 to 32rem in consistent increments
- **Border radius**: Sharp to fully rounded
- **Shadows**: 6 elevation levels

## Component Patterns

### Basic Components
- Buttons (primary, secondary, ghost, danger)
- Form elements (inputs, selects, checkboxes)
- Cards, modals, alerts

### Retro Board Components
- Sticky notes, column headers, board headers
- User avatars, activity indicators

## Best Practices

### Use Design Tokens
```jsx
// ❌ Don't hardcode
<div className="bg-[#0ea5e9]">

// ✅ Use tokens
<div className="bg-primary-500">
```

### Mobile-First Responsive
```jsx
<div className="text-sm md:text-base lg:text-lg">
```

### Interactive States
Every element needs: default, hover, focus, active, disabled states

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Color contrast
- Focus indicators

## Updating Process

1. **Update main guide** (`UI-DESIGN-GUIDE.md`)
2. **Update tokens** (`styles/design-tokens.css`)
3. **Update examples** (`components/ui-examples.tsx`)
4. **Test thoroughly** (light/dark, responsive, accessibility)
5. **Document changes**

## Claude Code Integration

When creating components:
1. References UI Design Guide automatically
2. Follows established patterns
3. Uses design tokens consistently
4. Enforces accessibility requirements

Keep `UI-DESIGN-GUIDE.md` updated for latest patterns.

## Common Mappings

| Token | Tailwind |
|-------|----------|
| `--color-primary-500` | `bg-primary-500` |
| `--spacing-4` | `p-4`, `m-4` |
| `--radius-lg` | `rounded-lg` |

## Dark Mode
Fully supported via CSS custom properties and Tailwind's `dark:` prefix.

## Performance
- Tailwind purges unused styles
- Use predefined classes
- CSS transitions over JS
- Lazy load large components

---
Consistency is key. Follow existing patterns and refer to the main design guide.