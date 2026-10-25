import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { ThemeSwatchRow } from '../ThemeSwatchRow';
import { renderWithTheme } from '@/testing/render';
import { THEMES, THEME_NAMES, ThemeName } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { useUserStore } from '@/stores/useUserStore';

type TestNode = ReturnType<typeof screen.getByRole>;

const labelFor = (name: ThemeName) => `palette ${name}`;
const radio = (name: ThemeName) => screen.getByRole('radio', { name: labelFor(name) });
const stylesWith = (root: TestNode, prop: 'backgroundColor' | 'borderColor') =>
  root
    .findAll(
      (node: TestNode) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.[prop] !== undefined,
    )
    .map((node: TestNode) => StyleSheet.flatten(node.props.style));

const renderRow = (selected: ThemeName, onSelect = jest.fn()) =>
  renderWithTheme(<ThemeSwatchRow selected={selected} onSelect={onSelect} labelFor={labelFor} />);

describe('ThemeSwatchRow', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('is one radio per palette, named by labelFor, with no visible text', () => {
    renderRow('gold');
    expect(screen.getAllByRole('radio')).toHaveLength(THEME_NAMES.length);
    for (const name of THEME_NAMES) expect(radio(name)).toBeOnTheScreen();
    expect(screen.queryByText(/\S/)).toBeNull();
  });

  it('checks only the selected palette', () => {
    renderRow('plum');
    expect(radio('plum')).toBeChecked();
    for (const name of THEME_NAMES.filter((other) => other !== 'plum')) expect(radio(name)).not.toBeChecked();
  });

  it('calls onSelect once with the pressed palette', () => {
    const onSelect = jest.fn();
    renderRow('gold', onSelect);
    fireEvent.press(radio('blue'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('blue');
  });

  it.each(THEME_NAMES)('%s: draws its page, its card as a ring inside the page, and its accent dot', (name) => {
    renderRow('gold');
    const palette = THEMES[name];
    expect(stylesWith(radio(name), 'backgroundColor')).toEqual([
      expect.objectContaining({ backgroundColor: palette.bg, width: 31, height: 31, borderRadius: radius.lg }),
      expect.objectContaining({ backgroundColor: palette.surface, width: 23, height: 23, borderRadius: radius.md }),
      expect.objectContaining({ backgroundColor: palette.gold, width: 15, height: 15, borderRadius: radius.sm }),
    ]);
  });

  it('draws six different cards, so no two palettes look alike', () => {
    renderRow('gold');
    const cards = THEME_NAMES.map((name) => stylesWith(radio(name), 'backgroundColor')[1]?.backgroundColor);
    expect(cards).toEqual(THEME_NAMES.map((name) => THEMES[name].surface));
    expect(new Set(cards).size).toBe(THEME_NAMES.length);
  });

  it.each(THEME_NAMES)('%s active: the selected ring is the current accent, the others the current border', (name) => {
    useUserStore.setState({ theme: name });
    renderRow(name);
    expect(THEME_NAMES.map((palette) => stylesWith(radio(palette), 'borderColor')[0]?.borderColor)).toEqual(
      THEME_NAMES.map((palette) => (palette === name ? THEMES[name].gold : THEMES[name].border)),
    );
  });
});
