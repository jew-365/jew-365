  // The nagging study's core, shared by every board: the day's data (data.json, computed by gen-data.mjs with the app's
  // own code), the level table and the placement rule (spec 3.2, 3.2.1), the nag resolution (3.3), the repeat offsets
  // (3.4), the trigger and fire rules ported from the planner and skipRules (checked against them by gen-data.mjs),
  // the mitzvah screen's state (each mitzvah's level and reminders), the level sheet, the reminder editor with the
  // nag block (4.2, 4.3) and the toast. Boards add their own state through boardState() and their own values through
  // renderVals(); they read everything here through this.core() and the helpers below.
  constructor(...args) {
    super(...args);
    this.state = Object.assign(
      {
        appLevel: null,
        levels: {},
        rem: {},
        sheet: null,
        editor: null,
        toast: null,
      },
      typeof this.boardState === 'function' ? this.boardState() : {},
    );
    this.flips = {};
    this.flipVals = {};
    // The gallery and the canvas tweaks speak through the hash: a change re-reads the app's level, and a board may
    // reset its own demo state in afterHash().
    this.onHash = () => this.setState({ appLevel: null }, () => this.afterHash && this.afterHash());
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.onHash);
    if (typeof this.boardMount === 'function') this.boardMount();
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHash);
    clearTimeout(this.toastTimer);
    if (typeof this.boardUnmount === 'function') this.boardUnmount();
  }

  opt(key) {
    const h = {};
    String(location.hash || '')
      .slice(1)
      .split('&')
      .forEach((kv) => {
        const i = kv.indexOf('=');
        if (i > 0) h[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
      });
    return key in h ? h[key] : this.props[key];
  }

  flip(key, val) {
    if (this.flipVals[key] !== val) {
      this.flipVals[key] = val;
      this.flips[key] = !this.flips[key];
    }
    return this.flips[key] ? 'a' : 'b';
  }

  data() {
    if (!this._data) this._data = /*DATA*/ null;
    return this._data;
  }

  // ---- copy and formats ----
  str(key, params) {
    const s = this.data().strings[key];
    if (s === undefined) return '[' + key + ']';
    return params ? s.replace(/%\{(\w+)\}/g, (_, p) => (params[p] === undefined ? '' : String(params[p]))) : s;
  }

  hm(ms) {
    const m = Math.floor(ms / 60000);
    const d = ((m % 1440) + 1440) % 1440;
    return String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
  }

  // fireTimeText(): dd/MM HH:mm on the location's clock.
  fireText(ms) {
    const [y, mo, d] = this.data().date.split('-').map(Number);
    const day = new Date(Date.UTC(y, mo - 1, d + Math.floor(ms / 86400000)));
    return String(day.getUTCDate()).padStart(2, '0') + '/' + String(day.getUTCMonth() + 1).padStart(2, '0') + ' ' + this.hm(ms);
  }

  mm(minutes) {
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  }

  theme() {
    return String(this.opt('theme') || 'gold') === 'dark' ? 'dark' : 'gold';
  }

  icon(name) {
    const set = this.data().icons[name];
    return typeof set === 'string' ? set : set[this.theme()];
  }

  // An icon as a background (a raw <img src="{{...}}"> would be fetched before the runtime fills it).
  iconStyle(name) {
    return 'background-image: url("' + this.icon(name) + '")';
  }

  phClass() {
    return 't-' + this.theme() + (String(this.opt('tall') || '') === '1' ? ' tall' : '');
  }

  // ---- levels (spec 3.2) ----
  appLevel() {
    if (this.state.appLevel) return this.state.appLevel;
    const l = Number(this.opt('level'));
    return [1, 2, 3, 4].includes(l) ? l : 1;
  }

  setAppLevel(level) {
    this.setState({ appLevel: level });
  }

  levelOf(level) {
    const t = this.data().nagLevels[level];
    return {
      level,
      count: t.count,
      every: t.everyMin,
      name: this.str('nag.level.' + level + '.name'),
      desc: this.str('nag.level.' + level + '.desc', { count: t.count, every: t.everyMin }),
      label: this.str('nag.level.' + level + '.name') + ' (' + level + ')',
    };
  }

  // remindersPerDay() over the default daily set, every reminder at the app's level.
  appPerDay(level) {
    return this.data().mainsPerDay * (1 + this.levelOf(level).count);
  }

  // ---- the placement rule (3.2.1) and the nag resolution (3.3) ----
  placementsFor(id, anchor) {
    if (anchor === 'blockExit') return ['after'];
    if (anchor === 'end' || id === 'krias_shma_al_hamita') return ['before'];
    return ['before', 'after', 'around'];
  }

  presetPlacement(id, anchor) {
    const allowed = this.placementsFor(id, anchor);
    return allowed.includes('after') ? 'after' : allowed[0];
  }

  nagFor(id, r, level) {
    if (r.nag === null) return null;
    const allowed = this.placementsFor(id, r.anchor);
    if (r.nag) return allowed.includes(r.nag.placement) ? r.nag : Object.assign({}, r.nag, { placement: allowed[0] });
    const p = this.levelOf(level);
    return p.count ? { count: p.count, everyMin: p.every, placement: this.presetPlacement(id, r.anchor) } : null;
  }

  // repeatOffsets(): minutes from the main, earliest first; repeat k is the k-th.
  offsets(nag) {
    const before = nag.placement === 'before' ? nag.count : nag.placement === 'around' ? Math.floor(nag.count / 2) : 0;
    const out = [];
    for (let i = 0; i < nag.count; i++) out.push((i < before ? i - before : i - before + 1) * nag.everyMin);
    return out;
  }

  placementWord(p) {
    return this.str('nag.placement.' + p);
  }

  // ---- mitzvot, their level and reminders ----
  mitzvah(id) {
    return this.data().mitzvot[id];
  }

  reminders(id) {
    return this.state.rem[id] || this.seedReminders(id);
  }

  seedReminders(id) {
    return this.mitzvah(id).reminders.map((r) => Object.assign({}, r));
  }

  mLevel(id) {
    return this.state.levels[id] || this.appLevel();
  }

  perDay(id, level) {
    return this.reminders(id).reduce((n, r) => n + 1 + ((this.nagFor(id, r, level) || {}).count || 0), 0);
  }

  // ---- the trigger and fire rules (buildTriggerTime() and reminderFires(), in ms since the day's midnight) ----
  trigger(r, w) {
    if (r.anchor === 'clock') {
      const after = (from) => {
        const day = Math.floor(from / 86400000) * 86400000;
        const first = day + r.offsetMin * 60000;
        return first < from ? first + 86400000 : first;
      };
      const inWindow = after(w.start);
      return inWindow <= w.end ? inWindow : after(w.start - this.data().headsUpMax * 60000);
    }
    return (r.anchor === 'start' ? w.start : w.end) + r.offsetMin * 60000;
  }

  // Why a trigger does not go out, or null when it does.
  dropReason(ms, w, anchor) {
    const D = this.data();
    if (ms <= D.nowMs) return 'past';
    if (anchor === 'followUp') return ms > w.end && ms <= w.end + D.followUpMax * 60000 ? null : ms <= w.end ? 'inWindow' : 'late';
    if (ms < w.start - D.headsUpMax * 60000) return 'early';
    if (ms > w.end) return 'end';
    return null;
  }

  // The reminder's next main that goes out (today's window, else tomorrow's), or null.
  nextMain(id, r) {
    const ws = this.mitzvah(id).windows;
    for (let i = 0; i < ws.length; i++) {
      const t = this.trigger(r, ws[i]);
      if (!this.dropReason(t, ws[i], r.anchor)) return { t, w: ws[i] };
    }
    return null;
  }

  // The chain of one reminder: its next main and each repeat with whether it goes out (spec 3.5 rules 2-4).
  chain(id, r, level) {
    const main = this.nextMain(id, r);
    if (!main) return null;
    const nag = this.nagFor(id, r, level);
    const repeats = nag
      ? this.offsets(nag).map((off, i) => {
          const t = main.t + off * 60000;
          return { t, k: i + 1, of: nag.count, off, drop: this.dropReason(t, main.w, r.anchor) };
        })
      : [];
    return { main: main.t, w: main.w, nag, repeats };
  }

  // timingSummary(), ported (checked by gen-data.mjs).
  summary(r) {
    if (r.anchor === 'clock') return this.str('reminder.summary.clock', { time: this.mm(r.offsetMin) });
    const timing = r.anchor === 'start' ? (r.offsetMin < 0 ? 'beforeStart' : 'fromStart') : r.anchor === 'end' ? 'beforeEnd' : r.anchor;
    const n = Math.abs(r.offsetMin);
    if (n === 0) {
      if (timing === 'beforeStart' || timing === 'fromStart') return this.str('reminder.summary.atStart');
      if (timing === 'beforeEnd') return this.str('reminder.summary.atEnd');
    }
    return this.str('reminder.summary.' + timing, { n });
  }

  // The row's nag line (spec 4.2).
  nagLine(id, r, level) {
    const preset = this.levelOf(level);
    if (r.nag === null) return preset.count ? { text: this.str('nag.row.none'), none: true } : null;
    const nag = this.nagFor(id, r, level);
    if (!nag) return null;
    const params = { count: nag.count, every: nag.everyMin, placement: this.placementWord(nag.placement) };
    return { text: this.str(r.nag ? 'nag.row.custom' : 'nag.row.fromLevel', params), none: false };
  }

  // ---- the mitzvah screen: header, level row, reminder rows ----
  mitzvahVals(id) {
    const m = this.mitzvah(id);
    const level = this.mLevel(id);
    const override = Boolean(this.state.levels[id]);
    const app = this.levelOf(this.appLevel());
    const own = this.levelOf(level);
    const perDay = this.str('detail.nagLevelPerDay', { n: this.perDay(id, level) });
    const rows = this.reminders(id)
      .map((r, index) => {
        const ch = this.chain(id, r, level);
        const line = this.nagLine(id, r, level);
        return {
          index,
          order: this.trigger(r, m.windows[0]),
          label: r.label || m.name,
          summary: this.summary(r),
          hasNext: Boolean(ch),
          next: ch ? this.str('detail.reminderNextAt', { time: this.fireText(ch.main) }) : '',
          hasLine: Boolean(line),
          line: line ? line.text : '',
          lineCls: line && line.none ? 'nagline none' : 'nagline',
          open: () => this.openEditor(id, index),
          del: () => this.showToast('בלוח הזה אין מחיקה; זה דמו של הנודניק'),
          delLabel: this.str('reminder.delete'),
        };
      })
      .sort((a, b) => a.order - b.order || a.index - b.index);
    const nexts = this.reminders(id)
      .map((r) => this.chain(id, r, level))
      .filter(Boolean)
      .flatMap((c) => [c.main, ...c.repeats.filter((x) => !x.drop).map((x) => x.t)]);
    const first = nexts.length ? Math.min(...nexts) : null;
    return {
      mName: m.name,
      mIconStyle: this.iconStyle(m.icon),
      mSub: this.str('mitzvah.cycle.daily') + ' · ' + m.timeRange,
      mHasNext: first !== null,
      mNext: first !== null ? this.str('detail.previewNext', { time: this.fireText(first) }) : '',
      mRows: rows,
      lvTitle: this.str('detail.nagLevel'),
      lvCaption: (override ? own.label : this.str('detail.nagLevelApp', { name: app.name, level: app.level })) + ' · ' + perDay,
      lvOpen: () => this.setState({ sheet: { kind: 'level', id } }),
      activeTitle: this.str('detail.activeTitle'),
      activeOn: this.str('detail.activeOn'),
      remTitle: this.str('detail.reminders'),
      addLabel: this.str('detail.addReminder'),
      addReminder: () => this.showToast('בלוח הזה מוסיפים דרך הטופס של מצווה אישית'),
      resetLabel: this.str('detail.defaultReset'),
      resetAll: () => {
        const rem = Object.assign({}, this.state.rem);
        delete rem[id];
        this.setState({ rem });
        this.showToast(this.str('detail.defaultReset'));
      },
      lvAria: this.str('detail.nagLevel') + ': ' + (override ? own.label : this.str('detail.nagLevelApp', { name: app.name, level: app.level })),
    };
  }

  // ---- the level sheet (spec 4.2) ----
  levelSheetVals() {
    const s = this.state.sheet;
    if (!s || s.kind !== 'level') return { lsOn: false, lsItems: [] };
    const id = s.id;
    const app = this.levelOf(this.appLevel());
    const cur = this.state.levels[id] || null;
    const items = [
      {
        label: this.str('detail.nagLevelApp', { name: app.name, level: app.level }),
        caption: this.str('detail.nagLevelPerDay', { n: this.perDay(id, app.level) }),
        on: cur === null,
        pick: () => this.pickLevel(id, null),
      },
    ].concat(
      [1, 2, 3, 4].map((l) => {
        const lv = this.levelOf(l);
        return {
          label: lv.label,
          caption: lv.desc + ' · ' + this.str('detail.nagLevelPerDay', { n: this.perDay(id, l) }),
          on: cur === l,
          pick: () => this.pickLevel(id, l),
        };
      }),
    );
    return { lsOn: true, lsItems: items, lsTitle: this.str('detail.nagLevel'), lsCaption: this.mitzvah(id).name, lsClose: () => this.setState({ sheet: null }) };
  }

  pickLevel(id, level) {
    const levels = Object.assign({}, this.state.levels);
    if (level === null) delete levels[id];
    else levels[id] = level;
    this.setState({ levels, sheet: null });
  }

  // ---- the reminder editor (spec 4.3) ----
  timingOf(r) {
    if (r.anchor === 'start') return r.offsetMin < 0 ? 'beforeStart' : 'fromStart';
    if (r.anchor === 'end') return 'beforeEnd';
    return r.anchor;
  }

  openEditor(id, index, overrides) {
    const r = this.reminders(id)[index];
    const timing = this.timingOf(r);
    const nag = r.nag;
    const preset = this.levelOf(this.mLevel(id));
    const draft = {
      id,
      index,
      timing,
      minutes: timing === 'clock' ? 0 : Math.abs(r.offsetMin),
      clock: r.anchor === 'clock' ? r.offsetMin : 9 * 60,
      label: r.label,
      skipIfDone: r.skipIfDone === true,
      mode: nag === null ? 'none' : nag ? 'custom' : 'level',
      count: nag ? nag.count : Math.max(1, preset.count),
      every: nag ? nag.everyMin : preset.every || 5,
      placement: nag ? nag.placement : this.presetPlacement(id, r.anchor),
    };
    this.setState({ editor: Object.assign(draft, overrides || {}), sheet: null });
  }

  draftReminder(d) {
    const anchor = d.timing === 'beforeStart' || d.timing === 'fromStart' ? 'start' : d.timing === 'beforeEnd' ? 'end' : d.timing;
    const offsetMin = d.timing === 'clock' ? d.clock : d.timing === 'beforeStart' || d.timing === 'beforeEnd' ? -d.minutes : d.minutes;
    const r = { anchor, offsetMin, label: d.label, skipIfDone: d.skipIfDone };
    if (d.mode === 'none') r.nag = null;
    else if (d.mode === 'custom') r.nag = { count: d.count, everyMin: d.every, placement: d.placement };
    return r;
  }

  edit(patch) {
    const d = Object.assign({}, this.state.editor, patch);
    const anchor = this.draftReminder(d).anchor;
    const allowed = this.placementsFor(d.id, anchor);
    if (!allowed.includes(d.placement)) d.placement = allowed[0];
    this.setState({ editor: d });
  }

  // The nag block's values for a draft; `pre` is the hole prefix's object (ed or c), `set` writes a patch.
  nagBlock(d, ctx) {
    const level = ctx.level;
    const lv = this.levelOf(level);
    const allowed = ctx.allowed;
    const presetNag = lv.count ? { count: lv.count, everyMin: lv.every, placement: allowed.includes('after') ? 'after' : allowed[0] } : null;
    const effect = presetNag
      ? this.str('nag.effect', { count: presetNag.count, every: presetNag.everyMin, placement: this.placementWord(presetNag.placement) })
      : this.str('nag.effect.none');
    const preview = ctx.preview;
    const ok = preview.filter((p) => !p.drop);
    const dropped = preview.filter((p) => p.drop);
    // nag.previewDropped covers a repeat after the end; the spec has no line for the other reasons, so these three are
    // the study's proposals (marked in the study's AGENTS.md).
    const PROPOSED = {
      early: '%{time} מוקדם ביותר משלוש שעות לפני תחילת הזמן, לא תישלח',
      past: '%{time} כבר עבר, לא תישלח',
      inWindow: '%{time} עוד לפני סוף הזמן, לא תישלח',
      late: '%{time} יותר מ-12 שעות אחרי הסוף, לא תישלח',
    };
    const dropText = (p) =>
      p.drop === 'end' ? this.str('nag.previewDropped', { time: p.time }) : PROPOSED[p.drop].replace('%{time}', p.time);
    const set = ctx.set;
    return {
      title: this.str('nag.title'),
      modes: ['level', 'none', 'custom'].map((m) => ({ label: this.str('nag.mode.' + m), on: d.mode === m, pick: () => set({ mode: m }) })),
      isLevel: d.mode === 'level',
      isNone: d.mode === 'none',
      isCustom: d.mode === 'custom',
      hasCaption: d.mode !== 'custom',
      caption: d.mode === 'none' ? this.str('nag.mode.noneCaption') : this.str('nag.mode.levelCaption', { name: lv.name, level, effect }),
      countLabel: this.str('nag.count'),
      count: d.count,
      less: () => set({ count: Math.max(1, d.count - 1) }),
      more: () => set({ count: Math.min(5, d.count + 1) }),
      lessOff: d.count <= 1,
      moreOff: d.count >= 5,
      lessLabel: this.str('nag.count.less'),
      moreLabel: this.str('nag.count.more'),
      everyLabel: this.str('nag.every'),
      everyChips: [3, 5, 10, 15].map((n) => ({ label: this.str('nag.every.option', { n }), on: d.every === n, pick: () => set({ every: n }) })),
      placeLabel: this.str('nag.placement'),
      placeMany: allowed.length > 1,
      placeOne: allowed.length === 1,
      placeOnly: allowed[0] === 'before' ? this.str('nag.placement.beforeOnly') : this.placementWord(allowed[0]),
      places: allowed.map((p) => ({ label: this.placementWord(p), on: d.placement === p, pick: () => set({ placement: p }) })),
      hasPreview: d.mode !== 'none' && preview.length > 0,
      hasOk: ok.length > 0,
      okText: this.str('nag.preview', { times: '' }).trim(),
      okTimes: ok.map((p) => p.time).join(' · '),
      allDropped: preview.length > 0 && ok.length === 0,
      allDroppedText: this.str('nag.previewAllDropped'),
      drops: (preview.length > 0 && ok.length === 0 ? dropped.filter((p) => p.drop !== 'end') : dropped).map((p) => ({ text: dropText(p) })),
    };
  }

  editorVals() {
    const d = this.state.editor;
    if (!d) return { edOn: false, ed: { nb: { modes: [], everyChips: [], places: [], drops: [] }, timings: [] } };
    const id = d.id;
    const m = this.mitzvah(id);
    const r = this.draftReminder(d);
    const level = this.mLevel(id);
    const ch = this.chain(id, r, level);
    const minutesKinds = { beforeStart: [0, this.data().headsUpMax], fromStart: [0, 720], beforeEnd: [0, 720] };
    const range = minutesKinds[d.timing];
    const preview = ch ? ch.repeats.map((x) => ({ time: this.hm(x.t), drop: x.drop })) : [];
    const w0 = m.windows[0];
    const send = ch
      ? { ok: true, text: this.str('detail.previewNext', { time: this.fireText(ch.main) }) }
      : { ok: false, text: this.str('reminder.errors.outsideWindowToday', { start: this.hm(w0.start), end: this.hm(w0.end) }) };
    const timings = ['beforeStart', 'fromStart', 'beforeEnd', 'clock'].map((k) => ({
      name: this.str('reminder.timing.' + k),
      caption: this.str('reminder.timing.' + k + '.caption', { max: this.data().headsUpMax }),
      on: d.timing === k,
      pick: () => {
        if (k === d.timing) return;
        const patch = { timing: k, timeText: undefined };
        if (k !== 'clock') patch.minutes = k === 'beforeStart' ? Math.min(d.minutes, this.data().headsUpMax) : d.minutes;
        this.edit(patch);
      },
    }));
    const nb = this.nagBlock(d, {
      level,
      allowed: this.placementsFor(id, r.anchor),
      preview: ch ? preview : [],
      set: (patch) => this.edit(patch),
    });
    return {
      edOn: true,
      edCls: 'enter-' + this.flip('ed', d.id + ':' + d.index),
      ed: {
        title: this.str('reminder.edit'),
        caption: m.name,
        timingLabel: this.str('reminder.timing'),
        timings,
        isClock: d.timing === 'clock',
        isMinutes: d.timing !== 'clock',
        minutesLabel: d.timing === 'clock' ? '' : this.str('reminder.minutes.' + d.timing),
        minutes: d.minutes,
        minLess: () => this.edit({ minutes: Math.max(range ? range[0] : 0, d.minutes - 5) }),
        minMore: () => this.edit({ minutes: Math.min(range ? range[1] : 720, d.minutes + 5) }),
        minLessLabel: this.str('reminder.minutes.less'),
        minMoreLabel: this.str('reminder.minutes.more'),
        timeLabel: this.str('reminder.time'),
        time: d.timeText !== undefined ? d.timeText : this.mm(d.clock),
        // A 24-hour text field (the app's TimeField is 24-hour; a browser's time input follows its own locale): the
        // raw text is kept, and the clock follows whenever it reads as HH:MM.
        onTime: (e) => {
          const v = String(e.target.value || '').slice(0, 5);
          const ok = /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
          this.edit(ok ? { timeText: v, clock: Number(v.slice(0, 2)) * 60 + Number(v.slice(3)) } : { timeText: v });
        },
        sendOk: send.ok,
        sendCls: send.ok ? 't-small c-gold' : 't-small c-urgent',
        sendText: send.text,
        nb,
        labelLabel: this.str('reminder.label'),
        label: d.label,
        onLabel: (e) => this.edit({ label: e.target.value }),
        skipLabel: this.str('reminder.skipIfDone'),
        skip: d.skipIfDone,
        toggleSkip: () => this.edit({ skipIfDone: !d.skipIfDone }),
        save: () => this.saveEditor(),
        saveLabel: this.str('common.save'),
        close: () => this.setState({ editor: null }),
        closeLabel: this.str('common.close'),
      },
    };
  }

  saveEditor() {
    const d = this.state.editor;
    if (!d) return;
    const list = this.reminders(d.id).slice();
    const r = this.draftReminder(d);
    if (!r.label) r.label = this.mitzvah(d.id).name;
    list[d.index] = r;
    const rem = Object.assign({}, this.state.rem, { [d.id]: list });
    this.setState({ rem, editor: null });
    this.showToast('נשמר');
  }

  // ---- Settings → Device and notifications (spec 4.1) ----
  settingsVals() {
    const level = this.appLevel();
    const lv = this.levelOf(level);
    return {
      stTitle: this.str('settings.title'),
      stDevice: this.str('settings.device'),
      stDeviceSub: this.str('settings.deviceSummary'),
      stZmanim: this.str('settings.zmanim'),
      stCity: this.data().city,
      stNotif: this.str('settings.notifications'),
      stNotifToggle: this.str('settings.notificationsToggle'),
      stNotifHint: this.str('settings.notificationsActiveHint'),
      stWeekly: this.str('settings.weeklyReport'),
      stWeeklyHint: this.str('settings.weeklyReportHint'),
      stQuietBefore: this.str('settings.quietBefore'),
      stQuietBeforeHint: this.str('settings.quietBeforeHint'),
      stQuietAfter: this.str('settings.quietAfter'),
      nlLabel: this.str('settings.nagLevel'),
      nlLevels: [1, 2, 3, 4].map((l) => {
        const x = this.levelOf(l);
        return {
          level: l,
          name: x.name,
          on: l === level,
          filled: l <= level,
          pick: () => this.setAppLevel(l),
          aria: x.label + ': ' + x.desc,
          perDay: this.appPerDay(l),
        };
      }),
      nlLevel: level,
      nlName: lv.name,
      nlDesc: lv.desc + '.',
      nlPerDay: this.str('settings.nagLevelPerDay', { n: this.appPerDay(level) }) + '.',
      nlHint: this.str('settings.nagLevelHint'),
    };
  }

  // ---- toast ----
  showToast(text) {
    clearTimeout(this.toastTimer);
    this.setState({ toast: { text, n: (this.state.toast ? this.state.toast.n : 0) + 1 } });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2600);
  }

  core() {
    const t = this.state.toast;
    return Object.assign(
      {
        phCls: this.phClass(),
        hasToast: Boolean(t),
        toastText: t ? t.text : '',
        toastCls: t ? 't' + this.flip('toast', t.n) : '',
        navSettings: this.str('nav.settings'),
        navHome: this.str('nav.home'),
        navMore: this.str('nav.more'),
        navSiddur: this.str('nav.siddur'),
        navHistory: this.str('nav.history'),
        back: this.str('common.back'),
        closeLabel: this.str('common.close'),
      },
      this.levelSheetVals(),
      this.editorVals(),
    );
  }
