import type { ComponentProps } from 'react';
import { Keyboard, Modal } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { OptionSelect } from '../OptionSelect';
import { MitzvahIcon } from '../MitzvahIcon';
import { renderWithTheme } from '@/testing/render';
import { THEMES } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useUserStore } from '@/stores/useUserStore';

type Mode = 'weekdays' | 'range' | 'streak';

const OPTIONS = [
  { value: 'weekdays', title: 'ימים קבועים', caption: 'חוזרת בימים שבוחרים' },
  { value: 'range', title: 'מתאריך עד תאריך', caption: 'טווח בלוח שנה' },
  { value: 'streak', title: 'ימים ברצף', caption: 'מהיום והלאה' },
] as const;

const LABEL = 'תזמון המצווה';
const BOX = `${LABEL}: ${OPTIONS[0].title}`;

function renderSelect(props: Partial<ComponentProps<typeof OptionSelect<Mode>>> = {}) {
  const onChange = jest.fn();
  renderWithTheme(
    <OptionSelect<Mode> label={LABEL} options={OPTIONS} value="weekdays" onChange={onChange} {...props} />,
  );
  return { onChange };
}

const sheet = () => within(screen.UNSAFE_getByType(Modal));

describe('OptionSelect', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('closed', () => {
    it('is a button named by the label and the selected title', () => {
      renderSelect();
      expect(screen.getByRole('button', { name: BOX })).toBeOnTheScreen();
    });

    it('shows the label, the selected title and its caption, and no other option', () => {
      renderSelect({ value: 'range' });
      expect(screen.getByText(LABEL)).toBeOnTheScreen();
      expect(screen.getByText(OPTIONS[1].title)).toBeOnTheScreen();
      expect(screen.getByText(OPTIONS[1].caption)).toBeOnTheScreen();
      expect(screen.queryByText(OPTIONS[0].title)).toBeNull();
      expect(screen.queryByText(OPTIONS[2].title)).toBeNull();
      expect(screen.getByRole('button', { name: `${LABEL}: ${OPTIONS[1].title}` })).toBeOnTheScreen();
    });

    it('draws no caption line for an option without one', () => {
      renderSelect({ options: [{ value: 'weekdays', title: 'ימים קבועים' }], value: 'weekdays' });
      expect(screen.getByText('ימים קבועים')).toBeOnTheScreen();
      expect(screen.queryByText(OPTIONS[0].caption)).toBeNull();
    });

    it('draws like the closed box of a time field, with a chevron down', () => {
      renderSelect();
      expect(screen.getByRole('button', { name: BOX })).toHaveStyle({
        backgroundColor: THEMES.gold.surface2,
        borderColor: THEMES.gold.border,
        borderRadius: radius.md,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
      });
      expect(screen.getByText(OPTIONS[0].title)).toHaveStyle({
        color: THEMES.gold.text,
        fontFamily: typography.bodyBold.fontFamily,
      });
      expect(screen.getByText(OPTIONS[0].caption)).toHaveStyle({
        color: THEMES.gold.textSub,
        fontSize: typography.small.fontSize,
      });
      const [icon] = screen.UNSAFE_getAllByType(MitzvahIcon);
      expect(icon.props).toMatchObject({
        name: 'chevronDown',
        size: 16,
        color: THEMES.gold.textMuted,
        strokeWidth: 2.5,
      });
    });

    it('draws the label as a field label', () => {
      renderSelect();
      expect(screen.getByText(LABEL)).toHaveStyle({
        color: THEMES.gold.textSub,
        fontFamily: typography.captionBold.fontFamily,
      });
    });

    it('opens no sheet until it is pressed', () => {
      renderSelect();
      expect(screen.queryByRole('button', { name: 'סגור' })).toBeNull();
      expect(screen.queryByText(OPTIONS[1].title)).toBeNull();
    });
  });

  describe('its sheet', () => {
    it('dismisses the keyboard and opens a sheet titled by the label', () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss');
      renderSelect();
      fireEvent.press(screen.getByRole('button', { name: BOX }));
      expect(dismiss).toHaveBeenCalledTimes(1);
      expect(sheet().getByRole('button', { name: 'סגור' })).toBeOnTheScreen();
      expect(sheet().getByText(LABEL)).toBeOnTheScreen();
    });

    it('lists every option with its caption', () => {
      renderSelect();
      fireEvent.press(screen.getByRole('button', { name: BOX }));
      OPTIONS.forEach((option) => {
        expect(sheet().getByText(option.title)).toBeOnTheScreen();
        expect(sheet().getByText(option.caption)).toBeOnTheScreen();
      });
      expect(sheet().getByRole('button', { name: 'סגור' })).toBeOnTheScreen();
    });

    it('marks the selected option, and only it', () => {
      renderSelect({ value: 'range' });
      fireEvent.press(screen.getByRole('button', { name: `${LABEL}: ${OPTIONS[1].title}` }));
      expect(sheet().getByRole('button', { name: OPTIONS[1].title })).toBeSelected();
      expect(sheet().getByRole('button', { name: OPTIONS[0].title })).not.toBeSelected();
      expect(sheet().getByRole('button', { name: OPTIONS[2].title })).not.toBeSelected();
    });

    it('calls onChange once with the chosen value and closes the sheet', () => {
      const { onChange } = renderSelect();
      fireEvent.press(screen.getByRole('button', { name: BOX }));
      fireEvent.press(sheet().getByText(OPTIONS[2].title));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('streak');
      expect(screen.queryByRole('button', { name: 'סגור' })).toBeNull();
    });

    it('closes without a change from its Close button', () => {
      const { onChange } = renderSelect();
      fireEvent.press(screen.getByRole('button', { name: BOX }));
      fireEvent.press(sheet().getByRole('button', { name: 'סגור' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'סגור' })).toBeNull();
    });

    it('shows the new title in the closed box once the value follows', () => {
      const { rerender } = renderWithTheme(
        <OptionSelect<Mode> label={LABEL} options={OPTIONS} value="weekdays" onChange={jest.fn()} />,
      );
      rerender(<OptionSelect<Mode> label={LABEL} options={OPTIONS} value="streak" onChange={jest.fn()} />);
      expect(screen.getByRole('button', { name: `${LABEL}: ${OPTIONS[2].title}` })).toBeOnTheScreen();
      expect(screen.getByText(OPTIONS[2].caption)).toBeOnTheScreen();
    });
  });

  describe('inline', () => {
    it('draws a radiogroup named by the label, with no box and no sheet', () => {
      renderSelect({ inline: true });
      expect(screen.getByLabelText(LABEL).props.accessibilityRole).toBe('radiogroup');
      expect(screen.queryByRole('button', { name: BOX })).toBeNull();
      expect(screen.UNSAFE_queryAllByType(Modal)).toHaveLength(0);
      expect(
        screen.UNSAFE_queryAllByType(MitzvahIcon).filter((icon) => icon.props.name === 'chevronDown'),
      ).toHaveLength(0);
    });

    it('draws one radio per option with its caption', () => {
      renderSelect({ inline: true });
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      OPTIONS.forEach((option) => {
        expect(screen.getByRole('radio', { name: option.title })).toBeOnTheScreen();
        expect(screen.getByText(option.caption)).toBeOnTheScreen();
      });
    });

    it('marks the selected option as checked', () => {
      renderSelect({ inline: true, value: 'streak' });
      expect(screen.getByRole('radio', { name: OPTIONS[2].title })).toBeChecked();
      expect(screen.getByRole('radio', { name: OPTIONS[0].title })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: OPTIONS[1].title })).not.toBeChecked();
    });

    it('calls onChange once with the pressed value', () => {
      const { onChange } = renderSelect({ inline: true });
      fireEvent.press(screen.getByRole('radio', { name: OPTIONS[1].title }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('range');
    });

    it('keeps the label as a field label above the group', () => {
      renderSelect({ inline: true });
      expect(screen.getByText(LABEL)).toHaveStyle({ color: THEMES.gold.textSub });
    });
  });
});
