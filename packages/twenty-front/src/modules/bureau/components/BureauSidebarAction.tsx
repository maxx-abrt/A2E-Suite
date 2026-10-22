import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';

type BureauSidebarActionProps = {
  Icon: IconComponent;
  label: string;
  testId: string;
  to?: string;
  onClick?: () => void;
  isActive?: boolean;
  hint?: ReactNode;
};

export const BureauSidebarAction = ({
  Icon,
  label,
  testId,
  to,
  onClick,
  isActive = false,
  hint,
}: BureauSidebarActionProps) => (
  <div data-testid={testId}>
    <NavigationDrawerItem
      Icon={Icon}
      label={label}
      to={to}
      onClick={onClick}
      active={isActive}
      rightOptions={hint}
      triggerEvent="CLICK"
    />
  </div>
);
