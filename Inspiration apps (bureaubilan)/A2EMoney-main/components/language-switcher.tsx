'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { setUserLocale } from '@/lib/locale';
import { Locale, locales, localeLabels } from '@/i18n/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, TickCircle } from '@/components/iconsax';

interface LanguageSwitcherProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'ghost', 
  size = 'icon',
  className 
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(newLocale: Locale) {
    // Set cookie directly on client side
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    // Reload to apply the new locale
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          disabled={isPending}
          className={className}
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-lg border shadow-lg">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => handleLocaleChange(l)}
            className="flex items-center justify-between cursor-pointer font-medium"
          >
            <span>{localeLabels[l]}</span>
            {locale === l && <TickCircle size={16} variant="Bulk" className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
