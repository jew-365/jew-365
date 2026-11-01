import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { ReminderNagFields, nagEffect, nagModeOf } from '../ReminderNagFields';
import { t } from '@/i18n';
import { renderWithTheme } from '@/testing/render';
import type { Reminder } from '@/types/mitzvah';

type Props = Partial<React.ComponentProps<typeof ReminderNagFields>>;

function renderFields(props: Props = {}) {
  const onChange = jest.fn();
  renderWithTheme(
    <ReminderNagFields mitzvahId="shacharit" anchor="start" nag={undefined} level={1} onChange={onChange} {...props} />,
  );
  return onChange;
}

const radio = (name: string) => screen.getByRole('radio', { name });
const selected = (name: string) => radio(name).props.accessibilityState.selected;

describe('ReminderNagFields', () => {
  it('reads a stored nag as its mode', () => {
    expect(nagModeOf(undefined)).toBe('level');
    expect(nagModeOf(null)).toBe('none');
    expect(nagModeOf({ count: 1, everyMin: 3, placement: 'before' })).toBe('custom');
  });

  it('words an effect, a single repeat and half and half', () => {
    expect(nagEffect(null, t)).toBe(t('nag.effect.none'));
    expect(nagEffect({ count: 1, everyMin: 10, placement: 'around' }, t)).toBe(
      t('nag.effect.one', { every: 10, placement: t('nag.effect.placement.after') }),
    );
    expect(nagEffect({ count: 4, everyMin: 3, placement: 'around' }, t)).toBe(
      t('nag.effect', { count: 4, every: 3, placement: t('nag.effect.placement.around') }),
    );
  });

  it('shows the level’s effect while following it, and nothing to fill in', () => {
    renderFields({ level: 4 });
    expect(selected(t('nag.mode.level'))).toBe(true);
    expect(
      screen.getByText(
        t('nag.mode.levelCaption', {
          name: t('nag.level.4.name'),
          level: 4,
          effect: t('nag.effect', { count: 3, every: 5, placement: t('nag.effect.placement.after') }),
        }),
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(t('nag.count'))).toBeNull();
  });

  it('turns none into null and the level back into absent', () => {
    const onChange = renderFields();
    fireEvent.press(radio(t('nag.mode.none')));
    expect(onChange).toHaveBeenLastCalledWith(null);
    screen.unmount();
    const again = renderFields({ nag: null });
    expect(screen.getByText(t('nag.mode.noneCaption'))).toBeOnTheScreen();
    fireEvent.press(radio(t('nag.mode.level')));
    expect(again).toHaveBeenLastCalledWith(undefined);
  });

  it('starts a custom nag from the level, or from two every five at level 1, placed by the anchor', () => {
    const onChange = renderFields({ level: 2 });
    fireEvent.press(radio(t('nag.mode.custom')));
    expect(onChange).toHaveBeenLastCalledWith({ count: 1, everyMin: 10, placement: 'after' });
    screen.unmount();
    const fromOne = renderFields({ anchor: 'end' });
    fireEvent.press(radio(t('nag.mode.custom')));
    expect(fromOne).toHaveBeenLastCalledWith({ count: 2, everyMin: 5, placement: 'before' });
  });

  it('changes the count, the interval and the placement of its own nag', () => {
    const nag: Reminder['nag'] = { count: 2, everyMin: 5, placement: 'after' };
    const onChange = renderFields({ nag });
    fireEvent.press(screen.getByRole('button', { name: '5' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...nag, count: 5 });
    fireEvent.press(screen.getByRole('button', { name: t('nag.every.option', { n: 15 }) }));
    expect(onChange).toHaveBeenLastCalledWith({ ...nag, everyMin: 15 });
    fireEvent.press(radio(t('nag.placement.around')));
    expect(onChange).toHaveBeenLastCalledWith({ ...nag, placement: 'around' });
  });

  it('names the one placement a block exit and a before-the-end reminder allow', () => {
    renderFields({
      anchor: 'blockExit',
      mitzvahId: 'kiddush_levana',
      nag: { count: 2, everyMin: 5, placement: 'before' },
    });
    expect(screen.getByText(t('nag.placement.afterOnly'))).toBeOnTheScreen();
    screen.unmount();
    renderFields({ anchor: 'end', nag: { count: 2, everyMin: 5, placement: 'after' } });
    expect(screen.getByText(t('nag.placement.beforeOnly'))).toBeOnTheScreen();
  });

  it('lists the times sent and flags each that is not, and hides the preview for none', () => {
    const preview = [
      { time: '08:40', fires: false, afterEnd: false },
      { time: '08:45', fires: true, afterEnd: false },
      { time: '09:40', fires: false, afterEnd: true },
    ];
    renderFields({ nag: { count: 3, everyMin: 5, placement: 'around' }, preview });
    expect(screen.getByText(t('nag.preview', { times: '08:45' }))).toBeOnTheScreen();
    expect(screen.getByText(t('nag.previewSkipped', { time: '08:40' }))).toBeOnTheScreen();
    expect(screen.getByText(t('nag.previewDropped', { time: '09:40' }))).toBeOnTheScreen();
    screen.unmount();
    renderFields({ nag: null, preview });
    expect(screen.queryByTestId('nag-preview')).toBeNull();
  });
});
