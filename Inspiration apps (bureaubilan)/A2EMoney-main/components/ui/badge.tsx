import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:brightness-105',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-muted',
        success:
          'border-transparent bg-[color-mix(in_srgb,var(--success)_15%,var(--card))] text-[color-mix(in_srgb,var(--success)_75%,var(--foreground))]',
        warning:
          'border-transparent bg-[color-mix(in_srgb,var(--warning)_18%,var(--card))] text-[color-mix(in_srgb,var(--warning)_70%,var(--foreground))]',
        accent:
          'border-transparent bg-accent text-accent-foreground',
        ink:
          'border-transparent bg-foreground text-background',
        destructive:
          'border-transparent bg-[color-mix(in_srgb,var(--destructive)_15%,var(--card))] text-[color-mix(in_srgb,var(--destructive)_78%,var(--foreground))]',
        outline:
          'border border-border text-foreground [a&]:hover:bg-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
