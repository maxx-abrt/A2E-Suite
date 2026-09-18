import { BaseEmail } from 'src/components/BaseEmail';
import { CallToAction } from 'src/components/CallToAction';
import { MainText } from 'src/components/MainText';
import { Title } from 'src/components/Title';
import { type NotificationDigestEmailProps } from 'src/types/notification-email.type';
import { createI18nInstance } from 'src/utils/i18n.utils';

// Digest notification email: several email-channel notifications collapsed into
// one message by the notification service's aligned digest window, so a burst
// (e.g. a comment thread) never sends one email per event.
export const NotificationDigestEmail = ({
  items,
  link,
  locale,
}: NotificationDigestEmailProps) => {
  const i18n = createI18nInstance(locale);

  return (
    <BaseEmail width={333} locale={locale}>
      <Title value={i18n._('New notifications')} />
      <>
        {items.map((item, index) => (
          <MainText key={index}>
            {item.preview === null
              ? item.title
              : `${item.title} — ${item.preview}`}
          </MainText>
        ))}
      </>
      <br />
      <CallToAction href={link} value={i18n._('Open in A2E Suite')} />
      <br />
      <br />
    </BaseEmail>
  );
};

NotificationDigestEmail.PreviewProps = {
  items: [
    { title: 'You were mentioned', preview: 'Can you review the budget?' },
    { title: 'A budget threshold was reached', preview: 'Marketing is at 92%' },
  ],
  link: 'https://acme.example.com/inbox',
  locale: 'en',
} as NotificationDigestEmailProps;

export default NotificationDigestEmail;
