# Texxel — Editor Sidebar Implementation Guidelines (focused)

> Scope: **only** sidebar + document tree + editor-adjacent affordances. Preserve existing warm-paper tokens + typography from `DESIGN-SYSTEM.md`. No new backend services. Keep changes local to existing components (`apps/web/components/app/sidebar.tsx`, `document-tree.tsx`, `document-view.tsx`, `flux-editor.tsx`, `export-dialog.tsx`).

```json
{
  "doc": {
    "purpose": "Make the editor sidebar feel Notion-solid: predictable collapse modes, tree-first space, mobile-safe actions, and robust DnD feedback—without redesigning the whole app.",
    "non_goals": [
      "No new theme, no landing redesign",
      "No new backend endpoints/services",
      "No account-based E2E flows required"
    ]
  },
  "references": {
    "repo_files_to_read_first": [
      "/app/Texxel/DESIGN-SYSTEM.md",
      "/app/Texxel/apps/web/components/app/sidebar.tsx",
      "/app/Texxel/apps/web/components/app/document-tree.tsx",
      "/app/Texxel/apps/web/components/app/document-view.tsx",
      "/app/Texxel/apps/web/components/app/flux-editor.tsx",
      "/app/Texxel/apps/web/components/app/export-dialog.tsx"
    ],
    "inspiration_patterns": {
      "affine": "Tree-first sidebar with collapse-to-icons/tree-only modes + strong DnD affordances.",
      "huly": "Dense but calm navigation; actions hidden until hover/focus; keyboard-first."
    }
  },
  "design_constraints": {
    "preserve_tokens": {
      "palette": "Warm paper neutrals + coral accent (primary/ring).",
      "radius": "Use existing radius system; sidebar rows should be rounded-xl-ish, not sharp.",
      "motion": "Calm 120–220ms transitions; no bouncy springs."
    },
    "do_not": [
      "Do not add global centered layout",
      "Do not use transition: all",
      "Do not introduce new accent colors beyond existing presets",
      "Do not add gradients in reading areas"
    ]
  },
  "sidebar_modes": {
    "state_model": {
      "storage": "Persist in localStorage (or existing settings store if present) with a single key.",
      "keys": {
        "mode": "tx.sidebar.mode",
        "width": "tx.sidebar.width",
        "treeExpanded": "tx.sidebar.tree.expanded" 
      },
      "modes": [
        {
          "id": "full",
          "label": "Full",
          "behavior": "Workspace switcher + search + nav + tree + footer visible."
        },
        {
          "id": "tree-only",
          "label": "Tree",
          "behavior": "Hide top nav groups; keep only document tree header + tree + minimal footer (settings)."
        },
        {
          "id": "hidden",
          "label": "Hidden",
          "behavior": "Sidebar off-canvas; accessible via ⌘\\ and mobile hamburger."
        }
      ]
    },
    "toggle_controls": {
      "desktop": {
        "placement": "Top of sidebar header row (right aligned).",
        "controls": [
          {
            "type": "icon-button",
            "action": "cycle full → tree-only → hidden",
            "data_testid": "sidebar-mode-toggle-button",
            "tooltip": "Sidebar mode (⌘\\)"
          },
          {
            "type": "icon-button",
            "action": "collapse/expand all tree nodes",
            "data_testid": "sidebar-tree-collapse-all-button",
            "tooltip": "Collapse all"
          }
        ]
      },
      "mobile": {
        "pattern": "Use Sheet/Drawer for sidebar; default open state = hidden.",
        "data_testid": "mobile-sidebar-open-button"
      }
    },
    "resizing": {
      "desktop": {
        "min": 224,
        "max": 400,
        "default": 280,
        "behavior": "Resizing disabled in tree-only mode (lock width ~260) to reduce jitter."
      }
    }
  },
  "information_architecture_fixes": {
    "tree_space_priority": {
      "problem": "Nav groups consume vertical space; tree becomes cramped.",
      "fix": "In full mode, make nav groups collapsible; default collapsed when viewport height < 760px. In tree-only mode, hide them entirely."
    },
    "tree_depth_padding": {
      "problem": "Deep nesting becomes unreadable without indentation rhythm.",
      "fix": "Indent per depth using CSS var: `padding-left: calc(var(--tree-indent) * depth + base)`; clamp at max depth for mobile."
    },
    "row_density": {
      "target": "Notion-like: 32–36px row height; 8–10px horizontal padding; rounded-xl hover surface."
    }
  },
  "document_tree_row_spec": {
    "hit_targets": {
      "min_height": 36,
      "mobile": "No hover-only actions; actions must appear on focus/long-press or via context menu."
    },
    "layout": {
      "left": ["disclosure chevron", "doc icon", "title"],
      "right": ["status dot (optional)", "more menu"],
      "truncate": "Title truncates with ellipsis; keep 1 line."
    },
    "states": {
      "default": "transparent",
      "hover": "bg: color-mix(in oklch, var(--foreground) 4%, transparent)",
      "active": "bg: color-mix(in oklch, var(--primary) 10%, transparent) + left 3px primary bar",
      "selected": "same as active but without navigation change (multi-select future-safe)",
      "dragging": "opacity 0.6 + cursor grabbing",
      "drop_target": "outline 2px ring-ring/40 + bg accent tint",
      "error": "inline subtle badge + tooltip"
    },
    "micro_interactions": {
      "expand": "Animate height/opacity of children container (220ms, ease-standard).",
      "row_hover": "120ms background-color only.",
      "press": "active: translateY(0.5px) (only on buttons, not rows)."
    },
    "data_testids": {
      "row": "document-tree-row",
      "row_by_id": "document-tree-row-<docId>",
      "disclosure": "document-tree-row-disclosure-<docId>",
      "context": "document-tree-row-menu-<docId>",
      "drop_indicator": "document-tree-drop-indicator"
    }
  },
  "drag_and_drop": {
    "library": "Keep existing @dnd-kit usage (per DESIGN-SYSTEM.md).",
    "predictability_rules": [
      "Always show a single drop indicator line (before/after) OR a parent-highlight (nest). Never both at once.",
      "Auto-expand collapsed node after 650ms hover while dragging.",
      "Disable DnD when sidebar is hidden; in tree-only/full it works.",
      "On drop failure, toast with recovery action (Undo) if local reorder state exists."
    ],
    "drop_zones": {
      "between_rows": "Thin 2px indicator line, full width minus left indent.",
      "nest_into_row": "Row background tint + subtle inset border; show 'Move into' label on desktop only.",
      "trash": "Trash row becomes drop target; highlight destructive tint."
    },
    "keyboard_dnd": {
      "requirement": "Support dnd-kit KeyboardSensor for accessibility; at minimum, ensure focusable rows and aria-describedby for instructions.",
      "data_testid": "document-tree-keyboard-dnd"
    }
  },
  "sidebar_header": {
    "tree_header_row": {
      "contents": [
        "Section label (e.g., Documents)",
        "New doc button",
        "Filter/search within tree (optional, only if already exists)",
        "Mode toggle"
      ],
      "behavior": "Sticky within sidebar scroll area so tree actions remain reachable.",
      "data_testids": {
        "new_doc": "sidebar-new-document-button",
        "tree_search": "sidebar-tree-search-input"
      }
    },
    "remove_noise": {
      "rule": "If there are multiple redundant create buttons (topbar + sidebar), keep one primary in sidebar header and demote others to menu."
    }
  },
  "mobile_behavior": {
    "sidebar_container": {
      "pattern": "Use Sheet (shadcn) from left; overlay closes on navigation.",
      "scroll": "Tree uses ScrollArea; keep header sticky.",
      "data_testid": "mobile-sidebar-sheet"
    },
    "row_actions": {
      "pattern": "Use ContextMenu (shadcn) on long-press / right click; also show a trailing 'more' button always visible on touch devices.",
      "data_testid": "document-tree-row-more-button-<docId>"
    }
  },
  "errorproofing": {
    "save_indicator": {
      "location": "Topbar near title OR editor status area (existing).",
      "states": [
        {"id": "saved", "label": "Saved"},
        {"id": "saving", "label": "Saving…"},
        {"id": "offline", "label": "Offline"},
        {"id": "error", "label": "Couldn’t save", "action": "Retry"}
      ],
      "ui": "Use Badge + Tooltip; never modal-block typing.",
      "data_testids": {
        "status": "editor-save-status",
        "retry": "editor-save-retry-button"
      }
    },
    "tree_loading": {
      "pattern": "Skeleton rows (shadcn Skeleton) matching row height; avoid layout shift.",
      "data_testid": "document-tree-loading"
    },
    "empty_states": {
      "pattern": "Dashed border empty state inside tree area with one CTA.",
      "data_testid": "document-tree-empty"
    }
  },
  "component_usage": {
    "shadcn_ui": {
      "must_use": [
        {"name": "Button", "path": "/app/frontend/src/components/ui/button.jsx"},
        {"name": "Tooltip", "path": "/app/frontend/src/components/ui/tooltip.jsx"},
        {"name": "DropdownMenu", "path": "/app/frontend/src/components/ui/dropdown-menu.jsx"},
        {"name": "ContextMenu", "path": "/app/frontend/src/components/ui/context-menu.jsx"},
        {"name": "ScrollArea", "path": "/app/frontend/src/components/ui/scroll-area.jsx"},
        {"name": "Resizable", "path": "/app/frontend/src/components/ui/resizable.jsx"},
        {"name": "Sheet", "path": "/app/frontend/src/components/ui/sheet.jsx"},
        {"name": "Collapsible", "path": "/app/frontend/src/components/ui/collapsible.jsx"},
        {"name": "Separator", "path": "/app/frontend/src/components/ui/separator.jsx"},
        {"name": "Sonner", "path": "/app/frontend/src/components/ui/sonner.jsx"}
      ]
    },
    "implementation_note": "Repo uses .tsx in Texxel app; however, keep patterns compatible with JS if any new helper components are added elsewhere. Prefer existing component conventions in Texxel (likely TSX)."
  },
  "css_tokens_for_sidebar_only": {
    "additive_tokens": {
      "location": "Prefer existing global tokens; only add new CSS vars if missing.",
      "vars": {
        "--tree-row-h": "36px",
        "--tree-indent": "14px",
        "--tree-icon": "18px",
        "--tree-action": "28px",
        "--sidebar-gap": "10px"
      }
    },
    "tailwind_recipes": {
      "tree_row": "group relative flex h-[var(--tree-row-h)] items-center gap-2 rounded-xl px-2 text-sm text-foreground/90 hover:bg-[color-mix(in_oklch,var(--foreground)_4%,transparent)] focus-within:bg-[color-mix(in_oklch,var(--foreground)_4%,transparent)]",
      "active_indicator": "before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-primary",
      "row_right_actions": "ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none transition-opacity duration-150",
      "icon_button": "h-7 w-7 rounded-lg hover:bg-[color-mix(in_oklch,var(--foreground)_6%,transparent)]"
    }
  },
  "accessibility": {
    "requirements": [
      "All rows are focusable (button/link) with visible focus ring (ring-ring/40).",
      "Disclosure chevron is a separate button with aria-expanded.",
      "Context menu actions reachable via keyboard (Shift+F10 / Menu key).",
      "DnD has aria announcements (dnd-kit accessibility) and keyboard sensor enabled.",
      "Touch targets >= 44px for primary controls on mobile (use padding, not font size)."
    ]
  },
  "testing_hooks": {
    "rule": "Every interactive element and key info must have data-testid.",
    "minimum_set": [
      "sidebar-mode-toggle-button",
      "sidebar-new-document-button",
      "document-tree-row-<docId>",
      "document-tree-row-menu-<docId>",
      "document-tree-drop-indicator",
      "editor-save-status"
    ]
  },
  "implementation_sequence": {
    "step_by_step": [
      "1) In sidebar.tsx: introduce sidebar mode state + persistence; wire ⌘\\ toggle and mode cycle button.",
      "2) In sidebar.tsx: implement tree-only layout (hide nav groups, keep tree header + tree).",
      "3) In document-tree.tsx: normalize row height, indentation, and right-side actions visibility rules (hover/focus vs touch).",
      "4) In document-tree.tsx: tighten DnD feedback (single indicator, auto-expand on hover, keyboard sensor).",
      "5) In document-view.tsx / flux-editor.tsx: ensure save indicator states are visible and non-blocking; add retry affordance if already supported.",
      "6) In export-dialog.tsx: keep export actions grouped; ensure advanced exports don’t add extra sidebar noise (no new buttons in sidebar)."
    ]
  }
}
```

---

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
