import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { celebrateMark, MarkCelebrationHost } from '../MarkCelebration';
import { useLateMarkDialog } from '@/hooks/useLateMarkDialog';
import { useCompletionsStore } from '@/stores/useCompletionsStore';
import { useUserStore } from '@/stores/useUserStore';
import { durations } from '@/theme/tokens';
import { renderWithTheme } from '@/testing/render';

describe('the completion every mark plays', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
    useUserStore.setState({ language: 'he' });
    useCompletionsStore.getState().reset();
  });
  afterEach(() => jest.useRealTimers());

  it('resolves at once with no host mounted, so nothing waits for an animation that never plays', async () => {
    let done = false;
    void celebrateMark().then(() => (done = true));
    await act(async () => {});
    expect(done).toBe(true);
  });

  it('plays the check and the stamp over the screen, and resolves and clears when it ends', async () => {
    renderWithTheme(<MarkCelebrationHost />);
    expect(screen.queryByTestId('mark-celebration')).toBeNull();
    let done = false;
    act(() => void celebrateMark().then(() => (done = true)));
    expect(screen.getByTestId('mark-celebration')).toBeOnTheScreen();
    expect(screen.getByText('נעשה!')).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(durations.stamp - 1));
    expect(done).toBe(false);
    await act(async () => jest.advanceTimersByTime(1));
    expect(done).toBe(true);
    expect(screen.queryByTestId('mark-celebration')).toBeNull();
  });

  function Marker({ celebrate }: { celebrate?: boolean }) {
    const lateMark = useLateMarkDialog();
    return (
      <>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            lateMark.mark({ id: 'mincha', name: 'מנחה', date: new Date(), window: null }, undefined, { celebrate })
          }
        >
          <Text>mark</Text>
        </Pressable>
        {lateMark.dialog}
      </>
    );
  }

  it('plays on a mark made through the shared mark dialog, unless the caller animates it itself', () => {
    renderWithTheme(
      <>
        <Marker />
        <MarkCelebrationHost />
      </>,
    );
    fireEvent.press(screen.getByText('mark'));
    expect(screen.getByTestId('mark-celebration')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(durations.stamp));
    expect(screen.queryByTestId('mark-celebration')).toBeNull();
  });

  it('stays still for a caller with its own animation', () => {
    renderWithTheme(
      <>
        <Marker celebrate={false} />
        <MarkCelebrationHost />
      </>,
    );
    fireEvent.press(screen.getByText('mark'));
    expect(screen.queryByTestId('mark-celebration')).toBeNull();
  });
});
