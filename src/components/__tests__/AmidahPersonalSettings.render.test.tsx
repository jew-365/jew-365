const mockVerses = [
  { text: 'יוֹסֵף בֶּן פֹּרָת יוֹסֵף', source: { he: 'חק לישראל, ויחי, תורה', en: 'Chok LeYisrael, Vayechi' } },
  { text: 'יְהוָה רֹעִי לֹא אֶחְסָר', source: { he: 'תהלים, פרק כג', en: 'Psalms 23' } },
  { text: 'אַשְׁרֵי הָאִישׁ', source: { he: 'תהלים, פרק א', en: 'Psalms 1' } },
];
let mockLoad: () => Promise<typeof mockVerses> = async () => mockVerses;
jest.mock('@/services/PersonalVerses', () => ({ loadPersonalVerses: () => mockLoad() }));

import { act, fireEvent, screen } from '@testing-library/react-native';
import { AmidahPersonalSettings } from '../AmidahPersonalSettings';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';

const verses = () => useUserStore.getState().amidahVerses;

async function openAdd() {
  fireEvent.press(screen.getByRole('button', { name: 'הוספת פסוק' }));
  await act(async () => {});
}

describe('AmidahPersonalSettings', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.setState({ language: 'he' });
    mockLoad = async () => mockVerses;
  });

  it('finds the verses by their first and last letter and adds the one chosen', async () => {
    renderWithTheme(<AmidahPersonalSettings />);
    await openAdd();
    expect(screen.getByText('בחר אות ראשונה ואות אחרונה')).toBeOnTheScreen();
    fireEvent.press(screen.getAllByRole('button', { name: 'י' })[0]);
    fireEvent.press(screen.getAllByRole('button', { name: 'פ' })[1]);
    expect(screen.getByText('נמצאו 1 פסוקים')).toBeOnTheScreen();
    expect(screen.queryByText('יְהוָה רֹעִי לֹא אֶחְסָר')).toBeNull();
    fireEvent.press(screen.getByText('יוֹסֵף בֶּן פֹּרָת יוֹסֵף'));
    expect(verses()).toEqual(['יוֹסֵף בֶּן פֹּרָת יוֹסֵף']);
    expect(screen.getByTestId('amidah-verse-0')).toBeOnTheScreen();
  });

  it('says when a pair has no verse, and adds a typed one', async () => {
    renderWithTheme(<AmidahPersonalSettings />);
    await openAdd();
    fireEvent.press(screen.getAllByRole('button', { name: 'ב' })[0]);
    fireEvent.press(screen.getAllByRole('button', { name: 'ת' })[1]);
    expect(screen.getByText('לא נמצא פסוק לצירוף הזה. אפשר להקליד פסוק.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('amidah-verse-typed'), '  בְּרֵאשִׁית בָּרָא  ');
    fireEvent.press(screen.getByRole('button', { name: 'הוספת הפסוק שהוקלד' }));
    expect(verses()).toEqual(['בְּרֵאשִׁית בָּרָא']);
  });

  it('allows three verses at most and deletes one', async () => {
    useUserStore.getState().setAmidahVerses(['א', 'ב', 'ג']);
    renderWithTheme(<AmidahPersonalSettings />);
    const full = screen.getByRole('button', { name: 'אפשר עד 3 פסוקים' });
    expect(full).toBeDisabled();
    fireEvent.press(screen.getAllByRole('button', { name: 'מחיקת הפסוק' })[1]);
    expect(verses()).toEqual(['א', 'ג']);
  });

  it('tells a failed load and still lets a verse be typed', async () => {
    mockLoad = () => Promise.reject(new Error('no file'));
    renderWithTheme(<AmidahPersonalSettings />);
    await openAdd();
    expect(screen.getByText('לא הצלחנו לטעון את הפסוקים. אפשר להקליד פסוק.')).toBeOnTheScreen();
    expect(screen.getByTestId('amidah-verse-typed')).toBeOnTheScreen();
  });

  it('saves the personal prayer on blur and when the section closes', () => {
    const { unmount } = renderWithTheme(<AmidahPersonalSettings />);
    fireEvent.changeText(screen.getByTestId('amidah-prayer'), 'רפא נא');
    fireEvent(screen.getByTestId('amidah-prayer'), 'blur');
    expect(useUserStore.getState().amidahPrayer).toBe('רפא נא');
    fireEvent.changeText(screen.getByTestId('amidah-prayer'), 'רפא נא ושמור');
    unmount();
    expect(useUserStore.getState().amidahPrayer).toBe('רפא נא ושמור');
  });

  it('keeps the fields across a hydrate and clears them on reset', () => {
    useUserStore.getState().setAmidahVerses(['א', 'ב', 'ג', 'ד']);
    expect(verses()).toEqual(['א', 'ב', 'ג']);
    useUserStore.getState().reset();
    expect(verses()).toEqual([]);
    expect(useUserStore.getState().amidahPrayer).toBe('');
  });
});
