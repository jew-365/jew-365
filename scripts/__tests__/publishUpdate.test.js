jest.mock('child_process', () => ({ spawnSync: jest.fn() }));

const { spawnSync } = require('child_process');
const { expo } = require('../../app.json');
const { nextUpdateNumber, labelMessage, whatsNewLabels, requireWhatsNew, main } = require('../publish-update');

const listed = (message) => `"${message}" (5 hours ago by jew-365)`;
const listing = (...messages) => ({
  status: 0,
  stdout: JSON.stringify({ currentPage: messages.map((message) => ({ message })) }),
  stderr: '',
});

beforeEach(() => spawnSync.mockReset());

describe('nextUpdateNumber', () => {
  it('starts at 1 on a version nothing was published for', () => {
    expect(nextUpdateNumber([])).toBe(1);
  });

  it('counts the updates published before numbering began', () => {
    expect(nextUpdateNumber(['a', 'b', 'c', 'd'].map(listed))).toBe(5);
  });

  it('follows the highest number once updates carry one', () => {
    expect(
      nextUpdateNumber([listed('1.0.16-6: fix'), listed('1.0.16-5: siddur'), ...['a', 'b', 'c', 'd'].map(listed)]),
    ).toBe(7);
  });

  it('does not skip a number for a republished update, which keeps an older number or none', () => {
    expect(
      nextUpdateNumber([listed('Republish "1.0.16-5: siddur"'), listed('1.0.16-6: fix'), listed('1.0.16-5: siddur')]),
    ).toBe(7);
  });

  it('reads the number whether or not the CLI wraps the message in quotes', () => {
    expect(nextUpdateNumber(['1.0.17-3: raw message'])).toBe(4);
  });

  it('never reuses the number of a deleted update below the highest', () => {
    expect(nextUpdateNumber([listed('1.0.16-8: last')])).toBe(9);
  });
});

describe('labelMessage', () => {
  it('puts the label before a --message value and keeps every other flag', () => {
    expect(labelMessage(['--message', 'Siddur fixes', '--non-interactive'], '1.0.16-5')).toEqual([
      '--message',
      '1.0.16-5: Siddur fixes',
      '--non-interactive',
    ]);
  });

  it('labels the -m short flag', () => {
    expect(labelMessage(['-m', 'fix'], '1.0.16-5')).toEqual(['-m', '1.0.16-5: fix']);
  });

  it('labels the --message= form', () => {
    expect(labelMessage(['--message=a=b'], '1.0.16-5')).toEqual(['--message=1.0.16-5: a=b']);
  });

  it('refuses to publish without a message', () => {
    expect(() => labelMessage(['--non-interactive'], '1.0.16-5')).toThrow('--message');
    expect(() => labelMessage(['--message'], '1.0.16-5')).toThrow('--message');
  });
});

describe('whatsNewLabels', () => {
  it('reads the label of every entry and nothing else called label', () => {
    expect(
      whatsNewLabels(
        [
          "{ label: '1.0.21-2', date: '2026-10-25' },",
          "{ label: '1.0.21-1' }",
          "action: { label: { he: 'א', en: 'b' } }",
        ].join('\n'),
      ),
    ).toEqual(['1.0.21-2', '1.0.21-1']);
  });
});

describe('requireWhatsNew', () => {
  it('refuses a production update with no entry for its label and names the label', () => {
    expect(() => requireWhatsNew('production', '1.0.21-3', ['--message', 'x'], ['1.0.21-2'])).toThrow(
      'no entry for 1.0.21-3',
    );
  });

  it('lets a production update through once its label has an entry, and any other channel without one', () => {
    expect(requireWhatsNew('production', '1.0.21-2', ['--message', 'x'], ['1.0.21-2'])).toEqual(['--message', 'x']);
    expect(requireWhatsNew('preview', '1.0.21-3', ['--message', 'x'], [])).toEqual(['--message', 'x']);
  });

  it('skips the check for a rollback and drops the flag', () => {
    expect(
      requireWhatsNew('production', '1.0.21-3', ['--message', 'Rollback to 1.0.21-1', '--skip-whats-new'], []),
    ).toEqual(['--message', 'Rollback to 1.0.21-1']);
    expect(
      requireWhatsNew('production', '1.0.21-3', ['--skip-whats-new', '--message=Rollback to 1.0.21-1'], []),
    ).toEqual(['--message=Rollback to 1.0.21-1']);
  });

  it('refuses the skip flag for anything but a rollback', () => {
    expect(() =>
      requireWhatsNew('production', '1.0.21-3', ['--message', 'Siddur fixes', '--skip-whats-new'], []),
    ).toThrow('only for a rollback');
    expect(() => requireWhatsNew('production', '1.0.21-3', ['--skip-whats-new'], [])).toThrow('only for a rollback');
  });
});

describe('main', () => {
  it('stops pnpm update:production before publishing', () => {
    spawnSync.mockReturnValueOnce(listing(`${expo.version}-999: last`));
    expect(() => main(['production', '--message', 'Guide'])).toThrow(`no entry for ${expo.version}-1000`);
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawnSync.mock.calls[0][1]).toContain('update:list');
  });

  it('publishes a rollback without the flag', () => {
    spawnSync.mockReturnValueOnce(listing(`${expo.version}-999: last`)).mockReturnValueOnce({ status: 0 });
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      expect(main(['production', '--message', 'Rollback to x', '--skip-whats-new'])).toBe(0);
    } finally {
      write.mockRestore();
    }
    const args = spawnSync.mock.calls[1][1];
    expect(args).toContain('update');
    expect(args).toContain(`${expo.version}-1000: Rollback to x`);
    expect(args).not.toContain('--skip-whats-new');
  });

  describe('the app variant of the update', () => {
    const originalVariant = process.env.APP_VARIANT;

    afterEach(() => {
      if (originalVariant === undefined) delete process.env.APP_VARIANT;
      else process.env.APP_VARIANT = originalVariant;
    });

    function publishedEnv(channel, ...rest) {
      spawnSync.mockReturnValueOnce(listing(`${expo.version}-999: last`)).mockReturnValueOnce({ status: 0 });
      const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      try {
        expect(main([channel, '--message', 'Rollback to x', '--skip-whats-new', ...rest])).toBe(0);
      } finally {
        write.mockRestore();
      }
      expect(spawnSync.mock.calls[1][1]).toContain('update');
      return spawnSync.mock.calls[1][2].env;
    }

    it('builds the preview channel with the preview variant, so the update carries the preview identity', () => {
      delete process.env.APP_VARIANT;
      const env = publishedEnv('preview');
      expect(env.APP_VARIANT).toBe('preview');
      expect(env.EXPO_PUBLIC_UPDATE_NUMBER).toBe('1000');
    });

    it.each(['production', 'development'])('leaves APP_VARIANT unset for the %s channel', (channel) => {
      delete process.env.APP_VARIANT;
      expect(publishedEnv(channel).APP_VARIANT).toBeUndefined();
    });

    it.each(['production', 'development'])(
      'drops an APP_VARIANT left in the shell for the %s channel, so it never ships the preview identity',
      (channel) => {
        process.env.APP_VARIANT = 'preview';
        expect(publishedEnv(channel).APP_VARIANT).toBeUndefined();
      },
    );
  });
});
