  // Round 4's core (the owner's question of 2026-11-04: more room for the message inside the notification): the day's
  // sends of the smart nag (data/notif4.json, computed by gen-notif4.mjs with the app's own code), drawn as Samsung's
  // One UI draws them (collapsed: the title, the subText and the time on one row and one body line; expanded: the app
  // name, the subText and the time on the header row, then the title, the whole body and the actions) and as the
  // iPhone's lock screen does. The directions' wording is in dirText(); a board sets `const STYLE`.
  constructor(...args) {
    super(...args);
    this.state = { toast: null, look: null, plat: null, lvl: null, done: {}, open: {}, t: 0 };
    this.flips = {};
    this.flipVals = {};
    this.onHash = () => this.setState({ look: null, plat: null, lvl: null, done: {}, open: {} });
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.onHash);
    this.tick = setInterval(() => this.setState((s) => ({ t: (s.t || 0) + 1 })), 1000);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHash);
    clearTimeout(this.toastTimer);
    clearInterval(this.tick);
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

  theme() {
    return String(this.opt('theme') || 'gold') === 'dark' ? 'dark' : 'gold';
  }

  // The moments looked at, as the day's minutes (after midnight past 24:00): a moment just after a notification of
  // each kind, the one of the owner's screenshot (01:12) among them.
  LOOKS() {
    return [
      ['08:33', 8 * 60 + 33],
      ['16:43', 16 * 60 + 43],
      ['23:12', 23 * 60 + 12],
      ['01:12', 25 * 60 + 12],
      ['04:38', 28 * 60 + 38],
    ];
  }

  look() {
    const want = this.state.look || String(this.opt('at') || '01:12');
    return this.LOOKS().find(([l]) => l === want) || this.LOOKS()[3];
  }

  lookMs() {
    return this.look()[1] * 60000;
  }

  plat() {
    const want = this.state.plat || String(this.opt('platform') || 'samsung');
    return want === 'iphone' ? 'iphone' : 'samsung';
  }

  // The level from the demo's own chips or the hash; the canvas's level tweak (whose default is 1) is left out, so the
  // round opens on the medium level, where the nags of the owner's screenshot show.
  lvl() {
    const hash = /(?:^|&)level=(\d)/.exec(String(location.hash || '').slice(1));
    const want = this.state.lvl || (hash ? Number(hash[1]) : 3);
    return want === 1 ? 1 : 3;
  }

  // The sends that reached the tray by the moment looked at, of windows still open then, newest first: as the tray
  // holds them until the mitzvah is marked.
  arrived() {
    const D = this.data();
    const now = this.lookMs();
    return D.sends[this.lvl()]
      .filter((s) => s.at <= now && D.mitzvot[s.id].end > now && !this.state.done[s.id])
      .sort((a, b) => b.at - a.at)
      .slice(0, 6);
  }

  ago(at) {
    return this.hm(at);
  }

  bar(gone) {
    const full = Math.max(1, Math.min(10, Math.round(gone * 10)));
    return '▰'.repeat(full) + '▱'.repeat(10 - full) + ' ' + Math.round(gone * 100) + '% מהזמן עבר';
  }

  stageColor(stage) {
    return { green: '#13804A', orange: '#B85F00', red: '#C5221F' }[stage];
  }

  // One send in one direction: the title, the subText (Samsung's header row) or subtitle (the iPhone's bold second
  // line), the body's lines, and for the build direction the live countdown, the coloured end time and the progress.
  dirText(s) {
    const m = this.data().mitzvot[s.id];
    const ios = this.plat() === 'iphone';
    const r = { title: m.name, sub: s.line, lines: [s.body], chrono: null, endDigits: null, progress: null };
    if (STYLE === 'r4now') return r;
    if (STYLE === 'r4short') {
      r.lines = [s.short];
      return r;
    }
    if (STYLE === 'r4body') {
      if (!ios) {
        r.sub = '';
        r.lines = [s.line, s.body];
      }
      return r;
    }
    if (STYLE === 'r4both') {
      if (ios) r.lines = [s.short];
      else {
        r.sub = '';
        r.lines = [s.line, s.short];
      }
      return r;
    }
    if (STYLE === 'r4bar') {
      if (ios) r.lines = [this.bar(s.gone), s.short];
      else {
        r.sub = '';
        r.lines = [s.line, this.bar(s.gone), s.short];
      }
      return r;
    }
    // r4build: what a build adds on Android (a countdown that runs by itself in the header, the end time's digits in the
    // stage colour, a real progress bar); the iPhone keeps the recommended text.
    if (ios) {
      r.lines = [s.short];
      return r;
    }
    const left = Math.max(0, m.end - this.lookMs() - (this.state.t || 0) * 1000);
    const hh = Math.floor(left / 3600000);
    const mm = Math.floor((left % 3600000) / 60000);
    const ss = Math.floor((left % 60000) / 1000);
    r.sub = '';
    r.chrono = 'נשארו ' + hh + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
    r.endDigits = { lead: 'עד ', end: this.hm(m.end), style: 'color:' + this.stageColor(s.stage) + ';font-weight:700' };
    r.lines = [s.short];
    r.progress = 'width:' + Math.round(s.gone * 100) + '%;background:' + this.stageColor(s.stage);
    return r;
  }

  showToast(text) {
    clearTimeout(this.toastTimer);
    this.setState({ toast: { text, n: (this.state.toast ? this.state.toast.n : 0) + 1 } });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2600);
  }

  core() {
    const t = this.state.toast;
    const D = this.data();
    const plat = this.plat();
    const list = this.arrived();
    const items = list.map((s, i) => {
      const x = this.dirText(s);
      const key = s.id + '@' + s.at;
      const open = key in this.state.open ? this.state.open[key] : i === 0;
      const lines = x.lines.map((text, j) => ({ text, cls: 'sb-line' + (j === 0 && x.lines.length > 1 && x.lines[0] === s.line ? ' lead' : '') }));
      return {
        title: x.title,
        hasSub: Boolean(x.sub),
        sub: x.sub,
        first: x.lines[0],
        lines,
        open,
        closed: !open,
        time: this.hm(s.at),
        hasChrono: Boolean(x.chrono),
        chrono: x.chrono || '',
        hasEnd: Boolean(x.endDigits),
        endLead: x.endDigits ? x.endDigits.lead : '',
        endText: x.endDigits ? x.endDigits.end : '',
        endStyle: x.endDigits ? x.endDigits.style : '',
        hasProgress: Boolean(x.progress),
        progressStyle: x.progress || '',
        accentStyle: 'background:' + this.stageColor(s.stage),
        maskStyle: '-webkit-mask:url("' + D.icons.notifMask + '") center/contain no-repeat;mask:url("' + D.icons.notifMask + '") center/contain no-repeat',
        aria: [x.title, x.sub].concat(x.lines).filter(Boolean).join(', '),
        toggle: () => this.setState({ open: Object.assign({}, this.state.open, { [key]: !open }) }),
        toggleLabel: open ? 'צמצום' : 'הרחבה',
        markDone: () => {
          this.setState({ done: Object.assign({}, this.state.done, { [s.id]: true }) });
          this.showToast('סומן: ' + D.mitzvot[s.id].name + ' · ההתראות שלה ירדו מהמגש');
        },
        openText: () => this.showToast('פותח את הנוסח של ' + D.mitzvot[s.id].name),
      };
    });
    return {
      phCls: 't-' + this.theme() + ' p-' + plat,
      hasToast: Boolean(t),
      toastText: t ? t.text : '',
      toastCls: t ? 't' + this.flip('toast', t.n) : '',
      isSamsung: plat === 'samsung',
      isIphone: plat === 'iphone',
      clock: this.look()[0],
      dateLine: D.dateLine,
      appName: 'יהודי 365',
      appIconStyle: 'background-image:url("' + D.icons.appIcon + '")',
      items,
      empty: items.length === 0,
      emptyText: 'אין התראות פתוחות ב-' + this.look()[0] + '.',
      openTextLabel: this.str('siddur.open'),
      markDoneLabel: this.str('notifications.markDone'),
      looks: this.LOOKS().map(([label]) => ({ label, on: this.look()[0] === label, pick: () => this.setState({ look: label, done: {}, open: {} }) })),
      plats: [
        ['samsung', 'סמסונג'],
        ['iphone', 'אייפון'],
      ].map(([id, label]) => ({ label, on: plat === id, pick: () => this.setState({ plat: id }) })),
      lvls: [
        [1, 'רגיל'],
        [3, 'בינוני'],
      ].map(([l, label]) => ({ label: 'רמה: ' + label, on: this.lvl() === l, pick: () => this.setState({ lvl: l, done: {}, open: {} }) })),
    };
  }
