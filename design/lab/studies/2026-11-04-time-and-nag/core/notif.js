  // The notification boards' core, started from the 2026-11-01-nagging core (its hash options, data, copy, clock
  // formats, icons and toast) and rewritten for this study: the day's reminders (data/notif.json, computed by
  // gen-notif.mjs with the app's own code), the stage of the time left when a notification arrives, the directions'
  // wording (dirText()), and the Android shade and iPhone lock screen values. A board sets `const STYLE`.
  constructor(...args) {
    super(...args);
    this.state = Object.assign({ toast: null, look: null, plat: null, lvl: null, done: {} }, typeof this.boardState === 'function' ? this.boardState() : {});
    this.flips = {};
    this.flipVals = {};
    this.onHash = () => this.setState({ look: null, plat: null, lvl: null, done: {} });
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

  // ---- the demo's controls: the moment the phone is looked at, the platform and the nagging level ----
  LOOKS() {
    return ['06:00', '08:10', '08:50', '16:10', '19:10', '23:02'];
  }

  look() {
    const want = this.state.look || String(this.opt('at') || '08:10');
    return this.LOOKS().includes(want) ? want : '08:10';
  }

  lookMs() {
    const [h, m] = this.look().split(':').map(Number);
    return (h * 60 + m) * 60000;
  }

  plat() {
    const want = this.state.plat || String(this.opt('platform') || 'android');
    return want === 'iphone' ? 'iphone' : 'android';
  }

  lvl() {
    const want = this.state.lvl || Number(this.opt('level')) || 1;
    return [1, 2, 3, 4].includes(want) ? want : 1;
  }

  // ---- the time left when a notification arrives (formatRemaining(): minutes under an hour, H:MM hours from one) ----
  leftText(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return m + ' ' + this.str('time.unit.minutes');
    return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ' ' + this.str('time.unit.hours');
  }

  // The study's three stages: red at 15 minutes or under 20% of the window, orange at an hour or half the window,
  // green before that. A notification before its window's start is `before`.
  stageOf(at, w) {
    if (at < w.start) return 'before';
    const left = (w.end - at) / 60000;
    const share = (w.end - at) / (w.end - w.start);
    if (left <= 15 || share < 0.2) return 'red';
    if (left <= 60 || share <= 0.5) return 'orange';
    return 'green';
  }

  stageColor(stage) {
    return { green: '#13804A', orange: '#B85F00', red: '#C5221F', before: this.data().notifColor }[stage];
  }

  // Every notification of the day that has arrived by the moment looked at, newest first: the mains of the default
  // reminders and, at a level above 1, their repeats, each with the main's body.
  arrived() {
    const D = this.data();
    const now = this.lookMs();
    const out = [];
    for (const n of D.notes) {
      const w = D.mitzvot[n.id];
      const key = n.id + ':' + n.index;
      const chain = [{ at: n.at, k: 0, of: 0 }].concat(this.lvl() > 1 ? n.repeats[this.lvl()] : []);
      for (const c of chain) {
        if (c.at > now) continue;
        if (this.state.done[n.id]) continue;
        out.push({ key: key + '~' + c.k, id: n.id, at: c.at, k: c.k, of: c.of, body: n.body, w, m: w });
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }

  ago(at) {
    const m = Math.round((this.lookMs() - at) / 60000);
    if (m < 1) return 'עכשיו';
    if (m < 60) return 'לפני ' + m + ' דק\'';
    const h = Math.floor(m / 60);
    return h === 1 ? 'לפני שעה' : 'לפני ' + h + ' שעות';
  }

  // The wording of one notification for one direction: title, the subtitle line (Android's subText, the iPhone's
  // bold subtitle), the body, and the Android accent colour.
  dirText(n) {
    const w = n.w;
    const stage = this.stageOf(n.at, w);
    const until = 'עד ' + this.hm(w.end);
    const left = 'נשארו ' + this.leftText(w.end - n.at);
    const startsIn = 'מתחיל בעוד ' + this.leftText(w.start - n.at);
    const dot = { green: '🟢', orange: '🟠', red: '🔴', before: '⚪' }[stage];
    const name = w.name;
    const share = Math.max(0, Math.min(1, (w.end - n.at) / (w.end - w.start)));
    const body = n.body + (n.k ? ' · ' + this.str('notifications.nag.repeat', { k: n.k, n: n.of }) : '');
    const r = { title: name, sub: '', body, accent: this.data().notifColor, stage };
    const timePart = stage === 'before' ? startsIn : until + ' · ' + left;
    switch (STYLE) {
      case 'dot':
        r.sub = dot + ' ' + timePart;
        break;
      case 'combo':
        r.sub = stage === 'red' ? dot + ' ' + until + ' · הזמן כמעט נגמר' : dot + ' ' + timePart;
        r.accent = this.stageColor(stage);
        break;
      case 'meter': {
        const full = stage === 'before' ? 5 : Math.max(1, Math.ceil(share * 5));
        const sq = { green: '🟩', orange: '🟧', red: '🟥', before: '🟦' }[stage];
        r.sub = sq.repeat(full) + '⬜'.repeat(5 - full) + ' ' + (stage === 'before' ? startsIn : left);
        break;
      }
      case 'quiet': {
        const full = stage === 'before' ? 5 : Math.max(1, Math.ceil(share * 5));
        r.sub = '▰'.repeat(full) + '▱'.repeat(5 - full) + ' ' + timePart;
        break;
      }
      case 'words':
        r.sub = stage === 'before' ? startsIn : { green: 'יש זמן', orange: 'כדאי להתחיל', red: 'הזמן כמעט נגמר' }[stage] + ' · ' + until;
        break;
      case 'hourglass':
        r.sub = (stage === 'green' || stage === 'before' ? '⏳' : '⌛') + ' ' + timePart;
        break;
      case 'accent':
        r.sub = timePart;
        r.accent = this.stageColor(stage);
        break;
      case 'inTitle':
        r.title = dot + ' ' + name + ' · ' + (stage === 'before' ? startsIn : left);
        r.body = body + ' · ' + until;
        break;
      case 'deadline':
        r.sub = stage === 'before' ? dot + ' ' + startsIn : dot + ' סוף הזמן ' + this.hm(w.end);
        break;
      case 'percent':
        r.sub = stage === 'before' ? dot + ' ' + startsIn : dot + ' נשאר ' + Math.round(share * 100) + '% מהזמן · ' + until;
        break;
      default:
        r.sub = timePart;
    }
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
    const items = this.arrived().map((n) => {
      const x = this.dirText(n);
      return {
        title: x.title,
        hasSub: Boolean(x.sub),
        sub: x.sub,
        body: x.body,
        time: this.hm(n.at),
        ago: this.ago(n.at),
        accentStyle: 'background:' + x.accent,
        inkStyle: 'color:' + x.accent,
        maskStyle: '-webkit-mask:url("' + D.icons.notifMask + '") center/contain no-repeat;mask:url("' + D.icons.notifMask + '") center/contain no-repeat;background:' + x.accent,
        aria: x.title + ', ' + x.sub + ', ' + x.body,
        markDone: () => {
          this.setState({ done: Object.assign({}, this.state.done, { [n.id]: true }) });
          this.showToast('סומן: ' + n.w.name + ' · ההתראות שלה ירדו מהמגש');
        },
        openText: () => this.showToast('פותח את הנוסח של ' + n.w.name),
      };
    });
    const [lh, lm] = this.look().split(':');
    return {
      phCls: 't-' + this.theme() + ' p-' + plat,
      hasToast: Boolean(t),
      toastText: t ? t.text : '',
      toastCls: t ? 't' + this.flip('toast', t.n) : '',
      isAndroid: plat === 'android',
      isIphone: plat === 'iphone',
      clock: this.look(),
      clockH: lh,
      clockM: lm,
      dateLine: D.dateLine,
      hebDate: D.hebDate,
      appName: 'יהודי 365',
      appIconStyle: 'background-image:url("' + D.icons.appIcon + '")',
      items,
      empty: items.length === 0,
      emptyText: 'אין התראות עד ' + this.look() + '.',
      openTextLabel: this.str('siddur.open'),
      markDoneLabel: this.str('notifications.markDone'),
      looks: this.LOOKS().map((x) => ({ label: x, on: this.look() === x, pick: () => this.setState({ look: x, done: {} }) })),
      plats: [
        ['android', 'אנדרואיד'],
        ['iphone', 'אייפון'],
      ].map(([id, label]) => ({ label, on: plat === id, pick: () => this.setState({ plat: id }) })),
      lvls: [1, 3].map((l) => ({ label: l === 1 ? 'בלי נודניק' : 'נודניק ' + this.str('nag.level.' + l + '.name'), on: this.lvl() === l, pick: () => this.setState({ lvl: l, done: {} }) })),
    };
  }
