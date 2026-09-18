import { BaseEmail } from 'src/components/BaseEmail';
import { CallToAction } from 'src/components/CallToAction';
import { MainText } from 'src/components/MainText';
import { Title } from 'src/components/Title';
import { type NotificationEmailProps } from 'src/types/notification-email.type';
import { createI18nInstance } from 'src/utils/i18n.utils';

// Instant notification email: a single event the user asked to receive by email
// rather than in the inbox. The digest template handles the collapsed burst.
export const NotificationEmail = ({
  item,
  link,
  locale,
}: NotificationEmailProps) => {
  const i18n = createI18nInstance(locale);

  return (
    <BaseEmail width={333} locale={locale}>
      <Title value={item.title} />
      <MainText>{item.preview ?? ''}</MainText>
      <br />
      <CallToAction href={link} value={i18n._('Open in A2E Suite')} />
      <br />
      <br />
    </BaseEmail>
  );
};

NotificationEmail.PreviewProps = {
  item: { title: 'You were mentioned', preview: 'Can you review the budget?' },
  link: 'https://acme.example.com/inbox',
  locale: 'en',
} as NotificationEmailProps;

export default NotificationEmail;
