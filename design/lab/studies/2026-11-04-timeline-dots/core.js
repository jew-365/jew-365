  // The timeline study's core, shared by every board: the day's data (data.json, computed by gen-data.mjs with the
  // app's own code), a port of the smart nag (smartNagTimes() of src/utils/nagging.ts, held to the app's own output by
  // check.mjs), the window's sends with their stage and wording, and the editing model the owner asked for on
  // 2026-11-04: every notification is a dot on the window's axis; a reminder drags along it, a nag drags too (the nags
  // then stop following the smart rule until "back to the smart nag"), a tap opens its values below the axis, and a tap
  // on an empty stretch of the axis adds a reminder there. Boards draw the axis their own way through renderVals().
  constructor(...args) {
    super(...args);
    this.state = Object.assign(
      { level: null, mid: null, rem: {}, manual: {}, sel: null, toast: null, dragKey: null, seq: 0, zoom: false },
      typeof this.boardState === 'function' ? this.boardState() : {},
    );
    this.drag = null;
    this.onHash = () => this.setState({ level: null, mid: null, sel: null }, () => this.afterHash && this.afterHash());
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.onHash);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHash);
    clearTimeout(this.toastTimer);
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

  data() {
    if (!this._data) this._data = /*DATA*/ null;
    return this._data;
  }

  str(key, params) {
    const text = this.data().copy[key];
    return String(text).replace(/%\{(\w+)\}/g, (m, k) => (params && k in params ? params[k] : m));
  }

  // ---- the day ----
  mid() {
    const m = this.state.mid || String(this.opt('m') || 'maariv');
    return this.data().mitzvot[m] ? m : 'maariv';
  }

  m() {
    return this.data().mitzvot[this.mid()];
  }

  level() {
    const l = this.state.level || Number(this.opt('level') || 3);
    return l >= 1 && l <= 4 ? l : 3;
  }

  hm(ms) {
    const day = 86400000;
    const min = Math.round((((ms % day) + day) % day) / 60000);
    return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  }

  // formatRemaining() of src/utils/clock.ts.
  remaining(ms) {
    const total = Math.max(0, Math.round(ms / 60000));
    if (total >= 2 * 24 * 60) return Math.floor(total / 1440) + ' ' + this.str('time.unit.days');
    if (total >= 60) return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0') + ' ' + this.str('time.unit.hours');
    return total + ' ' + this.str('time.unit.minutes');
  }

  // ---- the reminders and the nags ----
  reminders() {
    const id = this.mid();
    return this.state.rem[id] || this.m().reminders.map((r, i) => ({ key: 'r' + i, at: r.at, label: r.label }));
  }

  // smartNagTimes() of src/utils/nagging.ts with no quiet hours and no holy block (a plain weekday), so every planned
  // instant is accepted as it is.
  smartNags(m, taken, level) {
    const MIN = 60000;
    const count = this.data().zoneNags[level];
    const w = m.window;
    const inWin = (t) => t !== null && t >= w.start && t <= w.end;
    const points = [];
    const lc = m.lastChance;
    if (inWin(lc.alone)) points.push({ at: lc.alone, kind: 'lastChance', lastChance: 'alone' });
    if (inWin(lc.minyan)) points.push({ at: lc.minyan, kind: 'lastChance', lastChance: 'minyan' });
    const earliest = [lc.alone, lc.minyan].filter(inWin).sort((a, b) => a - b)[0];
    const first = taken.length ? Math.min.apply(null, taken) : -Infinity;
    const opens = Math.max(w.start, first);
    const zone = m.zone
      .map((z) => ({ start: Math.max(z.start, opens), end: Math.min(z.end, w.end, earliest === undefined ? Infinity : earliest) }))
      .filter((z) => z.end > z.start);
    const along = (share) => {
      const total = zone.reduce((s, z) => s + z.end - z.start, 0);
      let left = total * share;
      for (const z of zone) {
        if (left <= z.end - z.start) return z.start + left;
        left -= z.end - z.start;
      }
      return zone[zone.length - 1].end;
    };
    if (count && zone.length) for (let k = 1; k <= count; k++) points.push({ at: along(k / (count + 1)), kind: 'zone' });
    const zoneEnd = m.zone.length ? m.zone[m.zone.length - 1].end : null;
    if (count && m.sparse && zoneEnd !== null) {
      const from = Math.max(zoneEnd, opens);
      const until = Math.min(w.end, earliest === undefined ? Infinity : earliest);
      const n = Math.max(0, Math.min(count, Math.floor((until - from) / (this.data().sparseGapMin * MIN)) - 1));
      for (let k = 1; k <= n; k++) points.push({ at: from + ((until - from) * k) / (n + 1), kind: 'sparse' });
    }
    const gap = this.data().minGapMin * MIN;
    const kept = taken.slice();
    const clear = (t) => kept.every((o) => Math.abs(o - t) >= gap);
    const widestMiddle = () => {
      let best = null;
      for (const z of zone) {
        const marks = [z.start].concat(kept.filter((t) => t > z.start && t < z.end).sort((a, b) => a - b), [z.end]);
        for (let i = 1; i < marks.length; i++) {
          if (!best || marks[i] - marks[i - 1] > best.to - best.from) best = { from: marks[i - 1], to: marks[i] };
        }
      }
      return best && best.to - best.from >= 2 * gap ? (best.from + best.to) / 2 : null;
    };
    const nags = [];
    for (const p of points) {
      let at = p.at;
      if (!clear(at) && p.kind === 'zone') at = widestMiddle();
      if (at === null || !clear(at)) continue;
      kept.push(at);
      nags.push(Object.assign({}, p, { at }));
    }
    return nags.sort((a, b) => a.at - b.at);
  }

  nags() {
    const manual = this.state.manual[this.mid()];
    if (manual) return manual;
    const taken = this.reminders().map((r) => r.at);
    return this.smartNags(this.m(), taken, this.level()).map((n, i) => Object.assign({ key: 'n' + i }, n));
  }

  // The stretch of the window the axis shows: the whole window, or zoomed on the critical time (from half an hour before
  // the zone to the end), where the nags sit close together.
  view() {
    const w = this.m().window;
    if (!this.state.zoom) return w;
    const z = this.m().zone[0];
    return { start: Math.max(w.start, z.start - 30 * 60000), end: w.end };
  }

  isManual() {
    return Boolean(this.state.manual[this.mid()]);
  }

  // Every send of the window in time order, with its stage (the smart nag's spec 2.5: the last and the point alone red,
  // every other nag orange, every other reminder green) and its wording as the notification carries it.
  sends() {
    const m = this.m();
    const list = this.reminders()
      .map((r) => ({ key: r.key, at: r.at, type: 'reminder', label: r.label }))
      .concat(this.nags().map((n) => ({ key: n.key, at: n.at, type: n.kind, lastChance: n.lastChance })))
      .sort((a, b) => a.at - b.at);
    const last = list.length ? list[list.length - 1].key : null;
    return list.map((s) => {
      const alone = s.lastChance === 'alone';
      const stage = s.key === last || alone ? 'red' : s.type === 'reminder' ? 'green' : 'orange';
      const body =
        s.type === 'reminder'
          ? s.label
          : s.lastChance
            ? this.str(alone ? 'notifications.nag.lastChance' : 'notifications.nag.lastChanceMinyan')
            : this.str('notifications.nag.notMarked', { name: m.name });
      const mark = stage === 'red' ? '❗ ' : stage === 'orange' ? '⚠️ ' : '';
      const line = mark + this.str('notifications.timeLeft.line', { left: this.remaining(m.window.end - s.at), end: this.hm(m.window.end) });
      const kindName =
        s.type === 'reminder'
          ? 'תזכורת'
          : s.lastChance === 'alone'
            ? 'הזמן האחרון להתחיל'
            : s.lastChance === 'minyan'
              ? 'הזמן האחרון במניין'
              : s.type === 'sparse'
                ? 'נודניק אחרי חצות'
                : 'נודניק';
      return Object.assign(s, {
        stage,
        body,
        line,
        kindName,
        frac: (s.at - this.view().start) / (this.view().end - this.view().start),
        time: this.hm(s.at),
        on: this.state.sel === s.key,
        isReminder: s.type === 'reminder',
        isLast: s.type === 'lastChance',
        aria: kindName + ' ' + this.hm(s.at) + (this.state.sel === s.key ? ', נבחר' : ''),
      });
    });
  }

  // ---- editing ----
  setAt(key, at, extra) {
    const m = this.m();
    const id = this.mid();
    const clamp = Math.max(m.window.start, Math.min(m.window.end, Math.round(at / 60000) * 60000));
    if (key.charAt(0) === 'r') {
      const list = this.reminders().map((r) => (r.key === key ? Object.assign({}, r, { at: clamp }) : r));
      this.setState({ rem: Object.assign({}, this.state.rem, { [id]: list }) }, extra);
    } else {
      const list = this.nags().map((n) => (n.key === key ? Object.assign({}, n, { at: clamp }) : n));
      this.setState({ manual: Object.assign({}, this.state.manual, { [id]: list }) }, extra);
    }
  }

  nudge(key, minutes) {
    const s = this.sends().find((x) => x.key === key);
    if (s) this.setAt(key, s.at + minutes * 60000);
  }

  remove(key) {
    const id = this.mid();
    if (key.charAt(0) === 'r') {
      const list = this.reminders().filter((r) => r.key !== key);
      if (!list.length) return this.showToast('למצווה צריכה להישאר לפחות תזכורת אחת');
      this.setState({ rem: Object.assign({}, this.state.rem, { [id]: list }), sel: null });
      this.showToast('התזכורת נמחקה');
    } else {
      const list = this.nags().filter((n) => n.key !== key);
      this.setState({ manual: Object.assign({}, this.state.manual, { [id]: list }), sel: null });
      this.showToast('הנודניק נמחק. "חזרה לנודניק החכם" מחזיר אותו');
    }
  }

  addAt(at) {
    const id = this.mid();
    const seq = this.state.seq + 1;
    const key = 'r' + (100 + seq);
    const list = this.reminders().concat([{ key, at, label: 'תזכורת חדשה' }]);
    this.setState({ rem: Object.assign({}, this.state.rem, { [id]: list }), seq, sel: key }, () => this.setAt(key, at));
    this.showToast('נוספה תזכורת ב-' + this.hm(Math.round(at / 60000) * 60000));
  }

  resetSmart() {
    this.setState({ manual: Object.assign({}, this.state.manual, { [this.mid()]: null }), sel: null });
    this.showToast('הנודניק חזר לחישוב החכם');
  }

  pickLevel(level) {
    this.setState({ level, manual: Object.assign({}, this.state.manual, { [this.mid()]: null }), sel: null });
  }

  select(key) {
    this.setState({ sel: this.state.sel === key ? null : key });
  }

  showToast(text) {
    clearTimeout(this.toastTimer);
    this.setState({ toast: text });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2600);
  }

  // ---- the axis: a share of the window from the start, read in the axis box of the element; the start is on the
  // right, as the app's window card draws it in Hebrew.
  shareAt(e) {
    const box = e.currentTarget.closest('[data-axis]').getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget.closest('.ph')).direction === 'rtl';
    const x = rtl ? box.right - e.clientX : e.clientX - box.left;
    return Math.max(0, Math.min(1, x / box.width));
  }

  timeAt(share) {
    const w = this.view();
    return w.start + share * (w.end - w.start);
  }

  dotDown(e, key) {
    if (e.button > 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    const s = this.sends().find((x) => x.key === key);
    this.drag = { key, id: e.pointerId, x: e.clientX, off: this.shareAt(e) - s.frac, moved: false };
  }

  dotMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.abs(e.clientX - d.x) < 5) return;
    d.moved = true;
    if (this.state.dragKey !== d.key) this.setState({ dragKey: d.key, sel: d.key });
    this.setAt(d.key, this.timeAt(this.shareAt(e) - d.off));
  }

  dotUp(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    if (d.moved) this.setState({ dragKey: null });
    else this.select(d.key);
  }

  dotKey(e, key) {
    const step = { ArrowLeft: 5, ArrowRight: -5, ArrowUp: 1, ArrowDown: -1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    this.nudge(key, step);
  }

  axisTap(e) {
    this.addAt(this.timeAt(this.shareAt(e)));
  }

  // ---- what every board shows ----
  core() {
    const m = this.m();
    const sends = this.sends();
    const sel = sends.find((s) => s.on) || null;
    const level = this.level();
    return {
      phCls: this.opt('theme') === 'dark' ? 't-dark' : '',
      mName: m.name,
      mRange: m.timeRange,
      startClock: this.hm(this.view().start),
      endClock: this.hm(this.view().end),
      zoomOn: this.state.zoom,
      zoomLabel: this.state.zoom ? 'כל החלון' : 'זום לזמן הקריטי',
      toggleZoom: () => this.setState({ zoom: !this.state.zoom }),
      levelTitle: this.str('detail.nagLevel'),
      levels: [1, 2, 3, 4].map((l) => ({
        label: this.str('nag.level.' + l + '.name'),
        on: l === level,
        pick: () => this.pickLevel(l),
      })),
      count: sends.length + ' התראות בזמן הזה',
      zones: m.zone.map((z) => {
        const v = this.view();
        const a = Math.max(0, (z.start - v.start) / (v.end - v.start));
        const b = Math.min(1, (z.end - v.start) / (v.end - v.start));
        return { style: 'inset-inline-start:' + (a * 100).toFixed(2) + '%;width:' + ((b - a) * 100).toFixed(2) + '%' };
      }),
      zoneLabel: 'הזמן הקריטי',
      axisTap: (e) => this.axisTap(e),
      axisLabel: 'הוספת תזכורת בנקודה על הציר',
      sends,
      hasSel: Boolean(sel),
      sel: sel || { kindName: '', time: '', body: '', line: '', stage: 'green', isReminder: false },
      selCls: 'detail st-' + (sel ? sel.stage : 'green'),
      selLess: () => sel && this.nudge(sel.key, -5),
      selMore: () => sel && this.nudge(sel.key, 5),
      selDel: () => sel && this.remove(sel.key),
      selEdit: () => this.showToast('כאן נפתח עורך התזכורת המלא'),
      selClose: () => this.setState({ sel: null }),
      selIsReminder: Boolean(sel && sel.isReminder),
      manual: this.isManual(),
      manualNote: 'הזזת נודניק ידנית: הנודניקים של המצווה הזו כבר לא מחושבים אוטומטית',
      resetSmart: () => this.resetSmart(),
      dotsShown: (s) => s.frac >= -0.001 && s.frac <= 1.001,
      rows: sends.map((s) => Object.assign({}, s, { cls: 'srow st-' + s.stage + (s.on ? ' on' : ''), pick: () => this.select(s.key) })),
      hasToast: Boolean(this.state.toast),
      toastText: this.state.toast || '',
    };
  }

  // Per-dot handlers and position, for a board's sc-for over `sends`.
  dotVals(s, extra) {
    return Object.assign(
      {
        key: s.key,
        down: (e) => this.dotDown(e, s.key),
        move: (e) => this.dotMove(e),
        up: (e) => this.dotUp(e),
        keydown: (e) => this.dotKey(e, s.key),
        pos: 'inset-inline-start:' + (s.frac * 100).toFixed(3) + '%',
        aria: s.aria,
        time: s.time,
        on: s.on,
        dragging: this.state.dragKey === s.key,
      },
      extra || {},
    );
  }
