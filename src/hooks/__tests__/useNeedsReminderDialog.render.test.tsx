import { fireEvent, screen } from '@testing-library/react-native';
import { Button } from '@/components/Button';
import { useNeedsReminderDialog } from '../useNeedsReminderDialog';
import { renderWithTheme } from '@/testing/render';
import { useMitzvotStore } from '@/stores/useMitzvotStore';
import { DEFAULT_HILULA_NOTICES, useUserStore, type NoticeTopic } from '@/stores/useUserStore';

const TITLE = 'אין התראות';
const BODY = 'יש להגדיר לפחות התראה אחת בשביל להפעיל מעקב על המצווה';
const NOTICES_BODY = 'יש להגדיר לפחות התראה אחת בשביל להפעיל את ההתראות';

function Harness({ id, enabled, onSettings }: { id: string; enabled: boolean; onSettings: () => void }) {
  const { ask, setMitzvahEnabled, dialog } = useNeedsReminderDialog();
  return (
    <>
      <Button label="ask" onPress={() => ask(onSettings)} />
      <Button label="switch" onPress={() => setMitzvahEnabled(id, enabled, onSettings)} />
      {dialog}
    </>
  );
}

function NoticeHarness({
  topic,
  enabled,
  onSettings,
}: {
  topic: NoticeTopic;
  enabled: boolean;
  onSettings: () => void;
}) {
  const { ask, setNoticesEnabled, dialog } = useNeedsReminderDialog();
  return (
    <>
      <Button label="ask" onPress={() => ask(onSettings)} />
      <Button label="notices" onPress={() => setNoticesEnabled(topic, enabled, onSettings)} />
      {dialog}
    </>
  );
}

function setup(id = 'havdalah', enabled = true) {
  const onSettings = jest.fn();
  renderWithTheme(<Harness id={id} enabled={enabled} onSettings={onSettings} />);
  return { onSettings };
}

function setupNotices(topic: NoticeTopic, enabled = true) {
  const onSettings = jest.fn();
  renderWithTheme(<NoticeHarness topic={topic} enabled={enabled} onSettings={onSettings} />);
  return { onSettings };
}

const allHilulaKindsOff = () =>
  useUserStore.setState({
    hilulaNotices: {
      before: { ...DEFAULT_HILULA_NOTICES.before, enabled: false },
      evening: { ...DEFAULT_HILULA_NOTICES.evening, enabled: false },
    },
  });

const stored = (id: string) => useMitzvotStore.getState().activeMitzvot[id];

describe('useNeedsReminderDialog', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useMitzvotStore.getState().reset();
  });

  it('stays closed until asked', () => {
    setup();
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('asks in Hebrew with cancel and settings', () => {
    setup();
    fireEvent.press(screen.getByRole('button', { name: 'ask' }));
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(screen.getByText(BODY)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ביטול' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'הגדרה' })).toBeOnTheScreen();
  });

  it('asks in English', () => {
    useUserStore.setState({ language: 'en' });
    setup();
    fireEvent.press(screen.getByRole('button', { name: 'ask' }));
    expect(screen.getByText('No reminders')).toBeOnTheScreen();
    expect(screen.getByText('Set at least one reminder to start tracking this mitzvah')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen();
  });

  it('Cancel closes without running onSettings', () => {
    const { onSettings } = setup();
    fireEvent.press(screen.getByRole('button', { name: 'ask' }));
    fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(onSettings).not.toHaveBeenCalled();
  });

  it('Settings closes and runs onSettings once', () => {
    const { onSettings } = setup();
    fireEvent.press(screen.getByRole('button', { name: 'ask' }));
    fireEvent.press(screen.getByRole('button', { name: 'הגדרה' }));
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('switches a mitzvah with reminders on without asking', () => {
    setup('havdalah', true);
    fireEvent.press(screen.getByRole('button', { name: 'switch' }));
    expect(stored('havdalah').enabled).toBe(true);
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('asks for a mitzvah whose reminders were emptied and leaves it off', () => {
    useMitzvotStore.getState().setReminders('havdalah', []);
    const { onSettings } = setup('havdalah', true);
    fireEvent.press(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(stored('havdalah').enabled).toBe(false);
    expect(onSettings).not.toHaveBeenCalled();
  });

  it('switches off without asking even with no reminders', () => {
    useMitzvotStore.setState({
      activeMitzvot: { ...useMitzvotStore.getState().activeMitzvot, tefillin: { enabled: true, customReminders: [] } },
    });
    setup('tefillin', false);
    fireEvent.press(screen.getByRole('button', { name: 'switch' }));
    expect(stored('tefillin').enabled).toBe(false);
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  describe('notices', () => {
    it('switches Rosh Chodesh on without asking while a kind is on', () => {
      setupNotices('roshChodesh');
      fireEvent.press(screen.getByRole('button', { name: 'notices' }));
      expect(useUserStore.getState().roshChodeshEnabled).toBe(true);
      expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('asks for hilulot with every kind off, leaves the switch off, and runs onSettings only from Settings', () => {
      allHilulaKindsOff();
      const { onSettings } = setupNotices('hilulot');
      fireEvent.press(screen.getByRole('button', { name: 'notices' }));
      expect(screen.getByText(TITLE)).toBeOnTheScreen();
      expect(screen.getByText(NOTICES_BODY)).toBeOnTheScreen();
      expect(screen.queryByText(BODY)).toBeNull();
      expect(useUserStore.getState().hilulotEnabled).toBe(false);
      expect(onSettings).not.toHaveBeenCalled();

      fireEvent.press(screen.getByRole('button', { name: 'הגדרה' }));
      expect(screen.queryByText(TITLE)).toBeNull();
      expect(onSettings).toHaveBeenCalledTimes(1);
      expect(useUserStore.getState().hilulotEnabled).toBe(false);
    });

    it('words a later mitzvah question with the mitzvah body again', () => {
      allHilulaKindsOff();
      setupNotices('hilulot');
      fireEvent.press(screen.getByRole('button', { name: 'notices' }));
      fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));
      fireEvent.press(screen.getByRole('button', { name: 'ask' }));

      expect(screen.getByText(BODY)).toBeOnTheScreen();
      expect(screen.queryByText(NOTICES_BODY)).toBeNull();
    });

    it('switches off without asking', () => {
      useUserStore.setState({ hilulotEnabled: true });
      allHilulaKindsOff();
      setupNotices('hilulot', false);
      fireEvent.press(screen.getByRole('button', { name: 'notices' }));
      expect(useUserStore.getState().hilulotEnabled).toBe(false);
      expect(screen.queryByText(TITLE)).toBeNull();
    });
  });
});
