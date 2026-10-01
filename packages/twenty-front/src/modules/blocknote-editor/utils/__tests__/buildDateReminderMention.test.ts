import { describe, expect, it } from '@jest/globals';
import { Temporal } from 'temporal-polyfill';

import { buildDateReminderMention } from '@/blocknote-editor/utils/buildDateReminderMention';
import { getDateReminderMentionExportText } from '@/blocknote-editor/utils/getDateReminderMentionExportText';

const NOW = Temporal.Instant.from('2026-03-10T09:17:00Z');
const TIME_ZONE = 'UTC';
const LOCALE = 'en-US';

describe('buildDateReminderMention', () => {
  it('builds a non-invitation Agenda event on the next half-hour slot', () => {
    const { calendarEventInput } = buildDateReminderMention({
      now: NOW,
      timeZone: TIME_ZONE,
      locale: LOCALE,
    });

    expect(calendarEventInput.startsAt).toBe('2026-03-10T09:30:00Z');
    expect(
      Temporal.Instant.compare(
        Temporal.Instant.from(calendarEventInput.startsAt),
        Temporal.Instant.from(calendarEventInput.endsAt),
      ),
    ).toBe(-1);
    expect(calendarEventInput.isFullDay).toBe(false);
    expect(calendarEventInput.sendInvitations).toBe(false);
    expect(calendarEventInput.addConferencing).toBe(false);
    expect(calendarEventInput.timeZone).toBe(TIME_ZONE);
  });

  it('labels the chip with the event start and falls back to it as the title', () => {
    const { calendarEventInput, mention } = buildDateReminderMention({
      now: NOW,
      timeZone: TIME_ZONE,
      locale: LOCALE,
    });

    expect(mention.startsAt).toBe(calendarEventInput.startsAt);
    expect(mention.label.length).toBeGreaterThan(0);
    expect(calendarEventInput.title).toBe(mention.label);
  });

  it('keeps an explicit title but still labels the chip with the date', () => {
    const { calendarEventInput, mention } = buildDateReminderMention({
      now: NOW,
      timeZone: TIME_ZONE,
      locale: LOCALE,
      title: '  Relancer le client  ',
    });

    expect(calendarEventInput.title).toBe('Relancer le client');
    expect(mention.label).not.toBe('Relancer le client');
  });

  it('round-trips the chip through save→reload and exports its label to markdown', () => {
    const { mention } = buildDateReminderMention({
      now: NOW,
      timeZone: TIME_ZONE,
      locale: LOCALE,
    });

    const inlineContent = {
      type: 'dateReminder',
      props: { calendarEventId: 'event-1', ...mention },
    };

    // save→reload is a plain BlockNote JSON serialization round-trip.
    const reloaded = JSON.parse(JSON.stringify(inlineContent));

    expect(reloaded).toEqual(inlineContent);
    expect(getDateReminderMentionExportText(reloaded.props.label)).toBe(
      mention.label,
    );
  });
});
