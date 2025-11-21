# Modal Portal Pattern

## Why This Pattern Exists

This pattern solves a **critical CSS layout issue** where modals don't cover the full viewport.

### The Problem

When a parent element has certain CSS properties, it creates a **new containing block** for `position: fixed` descendants:

- `overflow: auto` / `overflow: hidden` ← **Most common culprit**
- `transform: translateX/Y/Z/scale/rotate`
- `perspective: <value>`
- `filter: <value>`
- `will-change: transform`

In our app, the `<main>` element in `Layout.tsx` has `overflow-y-auto`, which means any modal using `position: fixed` inside it will be constrained to the main element, not the full viewport.

### Visual Example

```
❌ WITHOUT Portal (broken):
┌─────────────────────────────────┐
│  Sidebar                        │
│                                 │
│  ┌────────────────────┐         │
│  │ Main (overflow-y)  │         │
│  │                    │         │
│  │  ┌──────────────┐  │         │ ← Modal only covers main
│  │  │ Modal Blur   │  │         │
│  │  │ (fixed)      │  │         │
│  │  └──────────────┘  │         │
│  │                    │         │
│  └────────────────────┘         │
└─────────────────────────────────┘
   Sidebar still visible!


✅ WITH Portal (correct):
┌─────────────────────────────────┐
│  ┌──────────────────────────┐   │ ← Modal covers everything
│  │ Modal Blur (fixed portal)│   │
│  │                          │   │
│  │  [Modal Content]         │   │
│  │                          │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
   Full viewport coverage!
```

## The Solution: ModalPortal Component

We've created a reusable `ModalPortal` component at `src/components/ui/modal-portal.tsx` that:

1. **Uses `createPortal`** to render directly into `document.body`
2. **Handles client-side mounting** to prevent SSR hydration issues
3. **Provides consistent backdrop and content wrappers** with animations
4. **Enforces proper z-index layering** (z-[100])

## Usage Examples

### Basic Usage

```tsx
import { ModalPortal } from '@/components/ui/modal-portal';

export function MyModal({ isOpen, onClose, children }) {
  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <ModalPortal.Backdrop onClick={onClose} />
        <ModalPortal.Content>
          {children}
        </ModalPortal.Content>
      </div>
    </ModalPortal>
  );
}
```

### With Custom Blur and Opacity

```tsx
<ModalPortal isOpen={isOpen}>
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <ModalPortal.Backdrop
      onClick={onClose}
      blur="lg"           // 'none' | 'sm' | 'md' | 'lg'
      opacity={80}        // 0-100
    />
    <ModalPortal.Content className="max-w-2xl w-full bg-white rounded-2xl p-6">
      <h2>My Modal</h2>
      <p>Content goes here</p>
    </ModalPortal.Content>
  </div>
</ModalPortal>
```

### Simple Modal (All-in-One)

For simple cases, use the `SimpleModal` wrapper:

```tsx
import { SimpleModal } from '@/components/ui/modal-portal';

export function QuickModal({ isOpen, onClose }) {
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-6"
    >
      <h2>Simple Modal</h2>
      <p>This handles the portal, backdrop, and animations automatically</p>
    </SimpleModal>
  );
}
```

## Migration Guide

### Converting Existing Modals

**Before (Broken - No Portal)**:
```tsx
import { motion, AnimatePresence } from 'framer-motion';

export function OldModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white rounded-2xl p-6"
          >
            {/* Content */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

**After (Fixed - With Portal)**:
```tsx
import { ModalPortal } from '@/components/ui/modal-portal';

export function NewModal({ isOpen, onClose }) {
  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <ModalPortal.Backdrop onClick={onClose} />
        <ModalPortal.Content className="bg-white rounded-2xl p-6">
          {/* Content */}
        </ModalPortal.Content>
      </div>
    </ModalPortal>
  );
}
```

### Key Changes:
1. Remove `AnimatePresence` (handled by `ModalPortal`)
2. Remove manual `motion.div` wrappers for backdrop/content
3. Replace with `ModalPortal.Backdrop` and `ModalPortal.Content`
4. Upgrade z-index from `z-50` to `z-[100]`

## When to Use This Pattern

**✅ ALWAYS use ModalPortal for:**
- Full-screen modals
- Confirmation dialogs
- Form modals
- Any overlay that should cover the entire viewport
- Components rendered inside routes (under `<main>` with overflow)

**⚠️ MAY NOT need ModalPortal for:**
- Dropdowns rendered in the same stacking context
- Tooltips that don't need full-screen coverage
- Popovers that are positioned relative to a trigger element
- Components that are already at the document root level

## Component Checklist

When creating a new modal component, ask yourself:

- [ ] Does this need to cover the entire viewport (including sidebar)?
- [ ] Is this component rendered inside a route (under `<main>`)?
- [ ] Does it have a backdrop with blur?
- [ ] Should clicking the backdrop close the modal?

If you answered **YES** to any of these → **Use `ModalPortal`**

## Common Mistakes to Avoid

### ❌ Mistake 1: Using `fixed inset-0` without a portal
```tsx
// This will be clipped by parent overflow!
<div className="fixed inset-0 z-50">...</div>
```

### ❌ Mistake 2: Nesting fixed elements
```tsx
// Don't nest fixed containers
<div className="fixed inset-0">
  <div className="fixed inset-0 backdrop-blur"> // ← Unnecessary nesting
    <div className="fixed">...</div>
  </div>
</div>
```

### ❌ Mistake 3: Forgetting z-index consistency
```tsx
// Use z-[100] or higher for modals
<div className="fixed inset-0 z-10">  // ← Too low!
```

### ✅ Correct Pattern:
```tsx
<ModalPortal isOpen={isOpen}>
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <ModalPortal.Backdrop onClick={onClose} />
    <ModalPortal.Content>...</ModalPortal.Content>
  </div>
</ModalPortal>
```

## Architecture Notes

### Why createPortal?

React's `createPortal` allows rendering a component into a DOM node that exists outside the parent component's DOM hierarchy, while maintaining the React component tree for context, state, and events.

```tsx
// Events still bubble up the React tree (not the DOM tree)
<Parent>
  <ModalPortal>  {/* Renders to document.body */}
    <button onClick={handleClick}>  {/* onClick works! */}
  </ModalPortal>
</Parent>
```

### Why isMounted Check?

```tsx
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);

if (!isMounted) return null;
```

This prevents SSR hydration mismatches. During server-side rendering, `document.body` doesn't exist. We only create the portal after the component mounts on the client.

### Z-Index Strategy

We use `z-[100]` for modals to ensure they appear above all other content:

- Regular content: `z-0` to `z-40`
- Sticky headers/footers: `z-40` to `z-50`
- Dropdowns/tooltips: `z-50` to `z-90`
- **Modals**: `z-[100]` and above
- Critical overlays (errors): `z-[200]` and above

## Testing Modal Components

When testing modal components:

```tsx
import { render, screen } from '@testing-library/react';
import { MyModal } from './MyModal';

describe('MyModal', () => {
  it('should render into document.body via portal', () => {
    render(<MyModal isOpen={true} onClose={() => {}} />);

    // Modal content is in document.body, not in the test container
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should cover full viewport', () => {
    render(<MyModal isOpen={true} onClose={() => {}} />);

    const backdrop = screen.getByRole('dialog').parentElement;
    expect(backdrop).toHaveClass('fixed', 'inset-0');
  });
});
```

## References

- MDN: [Containing Block](https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block)
- React Docs: [createPortal](https://react.dev/reference/react-dom/createPortal)
- CSS Tricks: [Position Fixed and Transform](https://css-tricks.com/position-fixed-and-transform/)

## Migration Status

### ✅ Converted Components
- `InteractivePackingMode.tsx` - Trip packing quick mode
- `ConfirmModal.tsx` - Global confirmation dialog
- `ErrorModal.tsx` - Error dialog
- `ReactivateConfirmDialog.tsx` - Billing dialog

### 🔄 To Be Converted
- `AdmiredPersonModal.tsx`
- `FocusSessionDetailModal.tsx`
- `ThoughtDetailModal.tsx`
- `PackingListModal.tsx`
- Various inline modals in page.tsx files

### 📝 Pattern Established
All new modal components MUST use the `ModalPortal` pattern.

---

**Last Updated**: 2025-11-21
**Author**: Claude
**Related PR**: #fix-popup-blur-coverage
