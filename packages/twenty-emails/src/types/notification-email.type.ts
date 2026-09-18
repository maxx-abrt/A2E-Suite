import { type APP_LOCALES } from 'twenty-shared/translations';

// The email layer stays generic: the server resolves the notification type to a
// localized label and flattens the free-form payload to a preview, so this
// package never needs to know the notification taxonomy.
export type NotificationEmailItem = {
  title: string;
  preview: string | null;
};

export type NotificationEmailProps = {
  item: NotificationEmailItem;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export type NotificationDigestEmailProps = {
  items: NotificationEmailItem[];
  link: string;
  locale: keyof typeof APP_LOCALES;
};
