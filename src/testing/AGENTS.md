# AGENTS.md

## Purpose

- Own fixture helpers that exist only for the test suite.

## Ownership

- [zmanim.ts](zmanim.ts) resolves zmanim for a fixture and throws when they are unavailable, so a bad fixture fails loudly instead of returning `null` into an assertion.
- [zmanim.ts](zmanim.ts) also owns `at(location, wallClock)`, the instant a clock at the location shows, so a fixture means the same moment under every device zone. It throws on an unparseable wall clock.
- [siddur.ts](siddur.ts) owns `readSiddurText(nusach, id)`, a built siddur asset read from disk, and `siddurAssetFolder(nusach, id)`, the folder it comes from: the nusach's, or `shared` for a text listed in `SHARED_SIDDUR_TEXT_IDS`, as the generated map does. A text in `DOWNLOADED_SIDDUR_TEXT_IDS` is read from its gzip in [../../docs/selichot/](../../docs/selichot) through the manifest. The siddur content suite, its dump tool and the screens smoke test read assets through it. `TEXTS_NOT_SHIPPED` names the texts a nusach does not say, so the build writes no asset for them (only `ushpizin: ['chabad']`, R5); `shipsText(nusach, id)` and `shippedTextIds(nusach, ids)` are what every suite that loops over all texts and nuschaot reads, and the siddur content suite pins the list.
- [chok.ts](chok.ts) owns `installChokFixture(parashiyot = every parasha, version = 1)`: it puts an install of fixture file names into `useChokStore` (with `latestVersion` and `checkedAt` set, so no update check fires) and returns it. A test that needs the Chok LeYisrael add-on installed calls it, and resets with `useChokStore.getState().reset()`.
- [selichot.ts](selichot.ts) owns `installSelichotFixture(nuschaot = every nusach, version = 1)`: it puts an install of fixture file names into `useSelichotStore` (with `latestVersion` and `checkedAt` set, so no update check fires) and returns it. A test that needs the Selichot text or window calls it and resets with `useSelichotStore.getState().reset()`; without it the Selichot window is `null`.
- [expoFileSystem.ts](expoFileSystem.ts) owns the in-memory `expo-file-system` the add-on download suites run on: `expoFileSystemMock` (`Directory`, `File`, `Paths`, rooted at `file:///doc`), `fileSystemState` (`space`, `failWrite`, `failCreate` and the `fs` map) and `resetFileSystem()`. A suite installs it with `jest.mock('expo-file-system', () => require('@/testing/expoFileSystem').expoFileSystemMock)`.
- [intl.ts](intl.ts) owns `hideIntlDateNames(mode)` and `HIDDEN_INTL_NAMES`: they make `Intl.DateTimeFormat().formatToParts()` the way Hermes on iOS gives it, so a test can show that a date name does not depend on ICU. `deleted` removes the method, which sends Luxon to its own offset fallback and makes a Luxon Hebrew weekday or month name throw; `nameless` keeps the numeric parts and drops the weekday and the month names, so Luxon prints "null" for a Hebrew name. Luxon's English names come from its own tables and are unaffected, so an English assertion under either mode checks the dictionary only, and the Hebrew one carries the guard. It returns the function that restores the method; a suite installs it in `beforeAll` and restores it in `afterAll`.
- [render.tsx](render.tsx) owns `renderWithTheme(ui)`: React Native Testing Library's `render` with `ThemeProvider` as the wrapper, so a component that calls `useTheme()` or `useI18n()` renders as it does in the app. The theme and the language come from `useUserStore`; a test picks them with `useUserStore.setState({ theme, language })` and resets with `useUserStore.getState().reset()` in `beforeEach`. It also owns `findBackdrop()`, the press target behind a dialog or sheet, which has no role to query by.

## Local Contracts

- Nothing under [../](../) that ships in the app may import from this folder. It is test-only by contract, not by convention.
- Helpers here may throw. That is the point: in a fixture an impossible value is a broken test, whereas in production the same value is a state the app must survive — see the `null` contract in [../services/AGENTS.md](../services/AGENTS.md).
- Do not put these files under a `__tests__/` folder; Jest would collect them as suites with no tests.
- Shipped code never imports [render.tsx](render.tsx): it pulls in `@testing-library/react-native`, a devDependency that must stay out of the app bundle.
- Importing `@testing-library/react-native` registers its Jest matchers (`toBeOnTheScreen`, `toBeDisabled`, `toBeSelected`, `toHaveStyle`) and the automatic cleanup after each test, so [package.json](../../package.json) needs no `setupFilesAfterEnv`. `react-native-mmkv` falls back to its in-memory mock under Jest by itself, so a render test needs no `jest.mock` for the stores.
- `ConfirmDialog` and `BottomSheet` render nothing while `useQuietBlock()` is non-null; a test puts a block in `QuietBlockContext.Provider` instead of faking the clock.

## Work Guidance

- Add a helper only when the same fixture setup is repeated across suites, and keep it small enough to read at a glance.
- A helper must never encode expected behavior. Assertions belong in the test that makes the claim.
- In a render test, `fireEvent.press` and `fireEvent(el, 'longPress')` walk up to the nearest ancestor with that handler prop, and that ancestor can be the component under test when its own prop is named `onPress` or `onLongPress`: a handler dropped from the inner `Pressable` still passes. Press such a component with `userEvent.setup().press()` / `.longPress()`, which drives the host element's own responder, and confirm the test fails once the handler is removed from the component.

## Verification

- Run `pnpm test` after changing a helper; every suite that uses it must still pass.
- Run `pnpm typecheck` after changing a helper signature.

## Child DOX Index

- No child AGENTS.md files.
