  constructor(...args) {
    super(...args);
    this.state = Object.assign(
      {
        e: 0,
        marks: {},
        marking: null,
        focus: null,
        toast: null,
        gone: {},
        leaving: null,
        scrub: null,
        peek: false,
        pName: String(this.opt('userName') ?? 'דוד'),
        pGender: 'm',
        pTone: 'warm',
        pMitz: null,
        pCustom: {},
        pSheet: false,
        pDrop: null,
        pDraft: '',
        pTried: false,
      },
      typeof this.boardState === 'function' ? this.boardState() : {},
    );
    this.flips = {};
    this.flipVals = {};
    this.toastFlip = false;
    this.start = null;
    this.base = 0;
    this.onHash = () => this.forceUpdate();
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.onHash);
    this.timer = setInterval(() => this.setState((s) => ({ e: s.e + 1 })), 1000);
    if (typeof this.boardMount === 'function') this.boardMount();
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHash);
    clearInterval(this.timer);
    [this.toastTimer, this.markTimer, this.leaveTimer, this.pSheetTimer, this.pDropTimer, this.pDropOutTimer].forEach((x) => clearTimeout(x));
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

  sec(hm) {
    const [h, m] = hm.split(':').map(Number);
    return h * 3600 + m * 60;
  }

  clock(sec) {
    const m = Math.floor(sec / 60) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  left(sec) {
    const m = Math.max(0, Math.ceil(sec / 60));
    if (m < 60) return m + ' דק׳';
    const h = Math.floor(m / 60);
    const r = m % 60;
    const hs = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : h + ' שעות';
    return r ? hs + ' ו-' + r + ' דק׳' : hs;
  }

  hm(sec) {
    const m = Math.max(0, Math.ceil(sec / 60));
    return m < 60 ? m + ' דק׳' : Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  }

  dash(circ, pct) {
    return (circ * (1 - Math.max(0, Math.min(100, pct)) / 100)).toFixed(1);
  }

  jump(elId) {
    const el = document.getElementById(elId);
    const sc = el && el.closest('.scroll');
    if (!sc) return;
    const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12;
    sc.scrollTo({ top, behavior: 'smooth' });
  }


  data() {
    if (!this._data) this._data = /*DATA*/ null;
    return this._data;
  }

  realNow() {
    if (!this._fmt) {
      this._fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    }
    const parts = this._fmt.formatToParts(new Date());
    const g = (k) => parts.find((p) => p.type === k).value;
    return { date: g('year') + '-' + g('month') + '-' + g('day'), sec: Number(g('hour')) * 3600 + Number(g('minute')) * 60 + Number(g('second')) };
  }

  shiftDate(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  }

  daysBetween(a, b) {
    const ms = (k) => {
      const [y, m, d] = k.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    };
    return Math.round((ms(b) - ms(a)) / 86400000);
  }

  appDayOf(date, sec) {
    const days = this.data().days;
    if (days[date] && sec < days[date].z.alot * 60) {
      const prev = this.shiftDate(date, -1);
      if (days[prev]) return { date: prev, sec: sec + 86400 };
    }
    return { date, sec };
  }

  timeNow(ignoreScrub = false) {
    const D = this.data();
    const want = String(this.opt('startTime') ?? 'live');
    const fixed = /^\d{1,2}:\d{2}$/.test(want) ? want.padStart(5, '0') : null;
    const key = (fixed || 'live') + (this.opt('date') ? '@' + this.opt('date') : '');
    if (key !== this.start) {
      this.start = key;
      this.base = this.state.e;
    }
    const real = this.realNow();
    const a = this.appDayOf(real.date, real.sec);
    const forced = String(this.opt('date') ?? '');
    let date = D.days[forced] ? forced : D.days[a.date] ? a.date : D.demo;
    let t;
    if (fixed) {
      t = this.sec(fixed) + this.state.e - this.base;
    } else {
      t = a.sec;
    }
    let mode = fixed ? 'fixed' : 'live';
    if (this.state.peek === key) date = D.demo;
    const sc = this.state.scrub;
    if (!ignoreScrub && sc && sc.key === key) {
      date = sc.date;
      t = sc.sec;
      mode = 'scrub';
    }
    const day = D.days[date];
    if (t < day.z.alot * 60) t += 86400;
    if (t >= day.nextAlot * 60) t -= 86400;
    return { date, t, mode, key, peek: this.state.peek === key };
  }

  now() {
    return this.timeNow().t;
  }

  liveSec() {
    return this.timeNow(true).t;
  }

  day() {
    return this.data().days[this.timeNow().date];
  }

  dayKey() {
    return this.timeNow().date;
  }

  dayStart() {
    return this.day().z.alot * 60;
  }

  dayEnd() {
    return this.day().nextAlot * 60;
  }

  zmanSec(id) {
    return this.day().z[id] * 60;
  }

  scrub(sec) {
    const tn = this.timeNow();
    const lo = this.dayStart();
    const hi = this.dayEnd() - 60;
    this.setState({ scrub: { key: tn.key, date: tn.date, sec: Math.max(lo, Math.min(hi, Math.round(sec))) } });
  }

  goLive() {
    this.setState({ scrub: null, peek: false });
  }

  peekWeekday() {
    this.setState({ peek: this.timeNow().key, scrub: null });
  }

  holyAt(date, t) {
    const d = t >= 86400 ? this.shiftDate(date, 1) : date;
    const m = (t >= 86400 ? t - 86400 : t) / 60;
    return (
      this.data().blocks.find((b) => (d > b.erev || (d === b.erev && m >= b.startMin)) && (d < b.end || (d === b.end && m < b.endMin))) || null
    );
  }

  items() {
    const z = this.day().z;
    const hm = (m) => this.clock(m * 60);
    const nextAlot = this.day().nextAlot;
    return [
      { id: 'tefillin', name: 'הנחת תפילין', short: 'תפילין', S: z.misheyakir * 60, E: z.shkia * 60, kind: 'box', cta: 'הנחתי', from: 'משיכיר', to: 'שקיעה' },
      { id: 'shma', name: 'קריאת שמע של שחרית', short: 'קריאת שמע', S: z.netz * 60, E: z.sofShma * 60, kind: 'book', cta: 'קראתי', from: 'הנץ', to: 'סוף זמן ק״ש' },
      { id: 'shacharit', name: 'תפילת שחרית', short: 'שחרית', S: z.netz * 60, E: z.sofTfila * 60, kind: 'sun', cta: 'התפללתי', from: 'הנץ', to: 'סוף זמן תפילה' },
      { id: 'mincha', name: 'תפילת מנחה', short: 'מנחה', S: z.minchaG * 60, E: z.shkia * 60, kind: 'sun', cta: 'התפללתי', from: 'מנחה גדולה', to: 'שקיעה' },
      { id: 'maariv', name: 'תפילת ערבית', short: 'ערבית', S: z.tzeit * 60, E: nextAlot * 60, kind: 'moon', cta: 'התפללתי', from: 'צאת הכוכבים', to: 'עלות השחר' },
      { id: 'shmaNight', name: 'קריאת שמע על המיטה', short: 'שמע על המיטה', S: z.tzeit * 60, E: nextAlot * 60, kind: 'moon', cta: 'קראתי', from: 'צאת הכוכבים', to: 'עלות השחר' },
    ]
      .filter((x) => this.state.pGender !== 'f' || x.id !== 'tefillin')
      .map((x) => ({ ...x, s: hm(x.S / 60), e: hm(x.E / 60) }));
  }

  zmanimList() {
    const z = this.day().z;
    return [
      { id: 'alot', name: 'עלות השחר', short: 'עלות', kind: 'dawn' },
      { id: 'misheyakir', name: 'משיכיר', short: 'משיכיר', kind: 'dawn' },
      { id: 'netz', name: 'הנץ החמה', short: 'הנץ', kind: 'rise' },
      { id: 'sofShma', name: 'סוף זמן קריאת שמע', short: 'סוף ק״ש', kind: 'day' },
      { id: 'sofTfila', name: 'סוף זמן תפילה', short: 'סוף תפילה', kind: 'day' },
      { id: 'chatzot', name: 'חצות היום', short: 'חצות', kind: 'day' },
      { id: 'minchaG', name: 'מנחה גדולה', short: 'מנחה גד׳', kind: 'day' },
      { id: 'plag', name: 'פלג המנחה', short: 'פלג', kind: 'day' },
      { id: 'shkia', name: 'שקיעה', short: 'שקיעה', kind: 'set' },
      { id: 'tzeit', name: 'צאת הכוכבים', short: 'צאה״כ', kind: 'night' },
      { id: 'chatzotL', name: 'חצות הלילה', short: 'חצות לילה', kind: 'night' },
    ].map((x) => ({ ...x, S: z[x.id] * 60, t: this.clock(z[x.id] * 60) }));
  }

  seedAt(id) {
    const z = this.day().z;
    const m = { tefillin: z.netz + 75, shacharit: z.sofTfila - 40, mincha: z.minchaG + 110 }[id];
    return m === undefined ? null : m * 60;
  }

  doneAt(id) {
    const tn = this.timeNow();
    const k = tn.date + '|' + id;
    const v = k in this.state.marks ? this.state.marks[k] : this.seedAt(id);
    return v != null && v <= tn.t ? v : null;
  }

  mark(id) {
    if (this.state.marking) return;
    this.setState({ marking: id });
    clearTimeout(this.markTimer);
    this.markTimer = setTimeout(() => {
      const tn = this.timeNow();
      const it = this.items().find((x) => x.id === id);
      const late = Boolean(it && tn.t >= it.E);
      this.setState((s) => ({ marks: { ...s.marks, [tn.date + '|' + id]: tn.t }, marking: null, focus: s.focus === id ? null : s.focus }));
      this.showToast({ text: (late ? 'סומן באיחור: ' : 'סומן: ') + (it ? it.short : '') + ' · ' + this.clock(tn.t), undoId: id });
    }, 760);
  }

  undo(id) {
    const k = this.timeNow().date + '|' + id;
    clearTimeout(this.toastTimer);
    this.setState((s) => ({ marks: { ...s.marks, [k]: null }, toast: null }));
  }

  whenLabel(date, target) {
    const n = this.daysBetween(date, target);
    const wd = this.data().days[target] ? this.data().days[target].weekday : '';
    return n === 0 ? 'היום' : n === 1 ? 'מחר' : n === 2 ? 'מחרתיים, ב' + wd : 'בעוד ' + n + ' ימים, ב' + wd;
  }

  generalMsgs(date, t) {
    const D = this.data();
    const day = D.days[date];
    const shkia = day.z.shkia * 60;
    const hm = (m) => this.clock(m * 60);
    const out = [];
    const names = (list) => list.join(' ו');
    if (t < shkia && day.hilulaToday.length) {
      out.push({ id: 'hilula', icon: 'star', tag: 'היום', title: 'הילולת ' + names(day.hilulaToday), body: 'היום, ' + day.hebDay + '. דף חייו, שני לקחים וסיפור.', action: 'לדף שלו' });
    } else if (t >= shkia && day.hilulaTonight.length) {
      out.push({ id: 'hilula', icon: 'star', tag: 'הלילה', title: 'הילולת ' + names(day.hilulaTonight), body: 'נכנסה בשקיעה, ' + day.hebNight + '. דף חייו, שני לקחים וסיפור.', action: 'לדף שלו' });
    } else {
      for (let i = 1; i <= 10; i++) {
        const k = this.shiftDate(date, i);
        if (D.days[k] && D.days[k].hilulaToday.length) {
          out.push({ id: 'hilula', icon: 'star', tag: 'הילולא', title: 'הילולת ' + names(D.days[k].hilulaToday), body: this.whenLabel(date, k) + ', ' + D.days[k].hebDay + '.', action: 'לדף שלו' });
          break;
        }
      }
    }
    const nowMin = (t >= 86400 ? t - 86400 : t) / 60;
    const nowDate = t >= 86400 ? this.shiftDate(date, 1) : date;
    const block = D.blocks.find((b) => b.erev > nowDate || (b.erev === nowDate && b.startMin > nowMin));
    if (block) {
      const isShabbat = block.title.startsWith('שבת');
      out.push({ id: 'shabbat', icon: 'candle', tag: isShabbat ? 'שבת' : 'חג', title: block.title, body: 'הדלקת נרות ' + this.whenLabel(nowDate, block.erev).replace(/^בעוד \d+ ימים, /, '') + ' ב-' + hm(block.candle) + ' · צאת ' + (isShabbat ? 'השבת' : 'החג') + ' ' + hm(block.exit) });
    }
    const ahead = D.events.filter((e) => e.d >= nowDate && this.daysBetween(nowDate, e.d) <= 30);
    const rc = ahead.filter((e) => e.rc);
    if (rc.length) {
      const first = rc[0];
      const both = rc.filter((e) => e.title === first.title);
      const n = this.daysBetween(nowDate, first.d);
      const wds = both.map((e) => D.days[e.d].weekday.replace('יום ', '')).join(' ו');
      out.push({ id: 'rc', icon: 'moon', tag: 'ראש חודש', title: first.title, body: (n === 0 ? 'היום' : n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים') + ' · ' + (both.length > 1 ? 'ימים ' : 'יום ') + wds });
    }
    const ch = ahead.filter((e) => e.chanukah);
    if (ch.length) {
      const first = ch[0];
      const n = this.daysBetween(nowDate, first.d);
      out.push({ id: 'chanukah', icon: 'flame', tag: 'חנוכה', title: n === 0 ? first.title : 'חנוכה מתקרבת', body: n === 0 ? 'הדלקה הערב, מצאת הכוכבים.' : 'נר ראשון ' + (n === 1 ? 'מחר בערב' : 'בעוד ' + n + ' ימים, ב' + D.days[first.d].weekday + ' בערב') + '.' });
    }
    const other = ahead.find((e) => !e.rc && !e.chanukah);
    if (other && this.daysBetween(nowDate, other.d) <= 14) {
      const n = this.daysBetween(nowDate, other.d);
      out.push({ id: 'event', icon: 'calendar', tag: 'בקרוב', title: other.title, body: n === 0 ? 'היום' : this.whenLabel(nowDate, other.d) });
    }
    return out.map((m) => ({ kind: 'general', action: '', ...m }));
  }

  dismissMsg(id, title) {
    if (this.state.leaving) return;
    this.setState({ leaving: id });
    clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(() => {
      this.setState((s) => ({ gone: { ...s.gone, [id]: true }, leaving: null }));
      this.showToast({ text: 'הוסתרה: ' + title, msgId: id });
    }, 380);
  }

  restoreMsg(id) {
    clearTimeout(this.toastTimer);
    this.setState((s) => ({ gone: { ...s.gone, [id]: false }, toast: null }));
  }

  showToast(toast) {
    clearTimeout(this.toastTimer);
    this.toastFlip = !this.toastFlip;
    this.setState({ toast });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 4200);
  }

  personName() {
    return String(this.state.pName || '').trim();
  }

  pPart(sec) {
    const h = Math.floor(sec / 3600) % 24;
    return h >= 4 && h < 12 ? 'בוקר טוב' : h >= 12 && h < 17 ? 'צהריים טובים' : h >= 17 && h < 21 ? 'ערב טוב' : 'לילה טוב';
  }

  pLeft(sec) {
    const m = Math.max(0, Math.ceil(sec / 60));
    if (m < 60) return m + ' דקות';
    const h = Math.floor(m / 60);
    const r = m % 60;
    const hs = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : h + ' שעות';
    return r ? hs + ' ו-' + r + ' דקות' : hs;
  }

  pTemplates(m) {
    const f = this.state.pGender === 'f';
    return [
      { id: 'warm', name: 'חם', tpl: this.pPart(Math.max(m.S, this.now())) + ' {שם}, ' + (f ? 'מוכנה' : 'מוכן') + ' ל{מצווה}? יש זמן עד {עד}.' },
      { id: 'short', name: 'קצר', tpl: '{מצווה} · עד {עד}' },
      { id: 'formal', name: 'מכובד', tpl: '{שם}, הגיע זמן {מצווה}. סוף הזמן ב-{עד}.' },
      { id: 'boost', name: 'מעודד', tpl: '{שם}, 12 ימים ברצף. {מצווה} עכשיו, ' + (f ? 'ואת' : 'ואתה') + ' ביום ה-13.' },
      { id: 'custom', name: 'שלי', tpl: null },
    ];
  }

  pCustomTpl(id) {
    const v = this.state.pCustom[id];
    return v !== undefined ? v : '{שם}, {מצווה} עד {עד}. נשארו {נשאר}.';
  }

  pFill(tpl, m) {
    const nm = this.personName();
    let out = tpl;
    if (!nm) {
      out = out.replace(/\s\{שם\},/g, ',').replace(/^\{שם\},\s*/g, '').replace(/,\s*\{שם\}/g, '').split('{שם}').join('');
    }
    out = out.split('{שם}').join(nm).split('{מצווה}').join(m.name).split('{עד}').join(this.clock(m.E)).split('{נשאר}').join(this.pLeft(m.E - m.S));
    return out.replace(/\s{2,}/g, ' ').trim();
  }

  pBody(m) {
    const tones = this.pTemplates(m);
    if (this.state.pTone === 'custom') {
      const c = this.pCustomTpl(m.id);
      return this.pFill(c.trim() ? c : tones[1].tpl, m);
    }
    return this.pFill(tones.find((x) => x.id === this.state.pTone).tpl, m);
  }

  pOpen(id) {
    clearTimeout(this.pSheetTimer);
    const list = this.items();
    const pick = list.find((x) => x.id === id) ? id : list.find((x) => x.id === this.state.pMitz) ? this.state.pMitz : list[0].id;
    this.setState({ pSheet: 'open', pMitz: pick });
  }

  pCloseSheet() {
    clearTimeout(this.pSheetTimer);
    this.setState({ pSheet: 'closing' });
    this.pSheetTimer = setTimeout(() => this.setState({ pSheet: false }), 260);
  }

  pTest() {
    clearTimeout(this.pDropTimer);
    clearTimeout(this.pDropOutTimer);
    this.setState({ pDrop: null });
    setTimeout(() => {
      this.setState({ pDrop: 'in' });
      this.pDropTimer = setTimeout(() => {
        this.setState({ pDrop: 'out' });
        this.pDropOutTimer = setTimeout(() => this.setState({ pDrop: null }), 380);
      }, 3200);
    }, 30);
  }

  personalVals(focusId) {
    const s = this.state;
    const list = this.items();
    const m = list.find((x) => x.id === s.pMitz) || list[0];
    const lineM = list.find((x) => x.id === focusId) || null;
    const tones = this.pTemplates(m);
    const custom = this.pCustomTpl(m.id);
    const isCustom = s.pTone === 'custom';
    const customEmpty = isCustom && !custom.trim();
    const nameErr = Boolean(s.pTried) && !String(s.pDraft || '').trim();
    return {
      pNeedName: !this.personName(),
      pDraft: s.pDraft,
      onPDraft: (e) => this.setState({ pDraft: e.target.value.slice(0, 20) }),
      pSaveName: () => {
        const v = String(this.state.pDraft || '').trim();
        if (!v) {
          this.setState({ pTried: true });
          return;
        }
        this.setState({ pName: v, pTried: false, pDraft: '' });
      },
      pNameErr: nameErr,
      pNameErrCls: nameErr ? 'err' : '',
      pLine: lineM ? this.pBody(lineM) : 'אין עוד התראות היום.',
      pLineTitle: lineM ? lineM.name : 'הכול סומן',
      openPersonal: () => this.pOpen(focusId),
      pSheetOn: Boolean(s.pSheet),
      pSheetCls: s.pSheet === 'closing' ? 'closing' : '',
      pClose: () => this.pCloseSheet(),
      pNoteCls: 'p' + this.flip('pnote', s.pTone + '|' + m.id + '|' + s.pGender),
      pPrevTitle: m.name,
      pPrevBody: this.pBody(m),
      pNameVal: s.pName,
      onPName: (e) => this.setState({ pName: e.target.value.slice(0, 20) }),
      pGenderM: s.pGender !== 'f',
      pGenderF: s.pGender === 'f',
      pPickM: () => this.setState({ pGender: 'm' }),
      pPickF: () => this.setState({ pGender: 'f' }),
      pTones: tones.map((x) => ({ name: x.name, on: s.pTone === x.id, pick: () => this.setState({ pTone: x.id }) })),
      pMitzChips: list.map((x) => ({ chip: x.short, on: x.id === m.id, pick: () => this.setState({ pMitz: x.id }) })),
      pIsCustom: isCustom,
      pNotCustom: !isCustom,
      pWriteOwn: () => {
        const cur = tones.find((x) => x.id === s.pTone).tpl;
        this.setState({ pTone: 'custom', pCustom: { ...s.pCustom, [m.id]: cur } });
      },
      pCustomText: custom,
      pCustomCount: custom.length,
      pCustomEmpty: customEmpty,
      pTaErr: customEmpty ? 'err' : '',
      onPCustom: (e) => this.setState({ pCustom: { ...s.pCustom, [m.id]: e.target.value.slice(0, 120) } }),
      pTokens: [
        { label: 'שם', tok: '{שם}' },
        { label: 'מצווה', tok: '{מצווה}' },
        { label: 'כמה נשאר', tok: '{נשאר}' },
        { label: 'עד מתי', tok: '{עד}' },
      ].map((d) => ({
        label: d.label,
        aria: 'הוספת ' + d.label + ' לטקסט',
        add: () => {
          const cur = this.pCustomTpl(m.id);
          const next = (cur && !cur.endsWith(' ') ? cur + ' ' : cur) + d.tok;
          this.setState({ pCustom: { ...this.state.pCustom, [m.id]: next.slice(0, 120) } });
        },
      })),
      pSendTest: () => this.pTest(),
      pHasDrop: Boolean(s.pDrop),
      pDropCls: s.pDrop || '',
      pDropTitle: m.name,
      pDropBody: this.pBody(m),
    };
  }

  coreVals() {
    const s = this.state;
    const t = this.now();
    const f = s.pGender === 'f';
    const name = this.personName();
    const themeOpt = this.opt('theme');
    const theme = ['gold', 'rose', 'night'].includes(themeOpt) ? themeOpt : 'gold';
    const bigOpt = this.opt('bigText');
    const big = bigOpt === true || bigOpt === '1' || bigOpt === 'true';
    const tall = this.opt('tall') === '1';
    const tn = this.timeNow();
    const day = this.day();
    const AX0 = this.dayStart();
    const AXL = this.dayEnd() - AX0;
    const pos = (sec) => Math.round(Math.max(0, Math.min(1, (sec - AX0) / AXL)) * 1000) / 10;
    const icons = (k) => ({ isBox: k === 'box', isBook: k === 'book', isSun: k === 'sun', isMoon: k === 'moon' });
    const all = this.items();
    const statusOf = (x) => (this.doneAt(x.id) != null ? 'done' : t >= x.E ? 'missed' : t >= x.S ? 'active' : 'upcoming');
    const base = (x) => ({
      id: x.id,
      name: x.name,
      short: x.short,
      startT: this.clock(x.S),
      endT: this.clock(x.E),
      fromName: x.from,
      toName: x.to,
      range: this.clock(x.S) + ' – ' + this.clock(x.E),
      endsTomorrow: x.E >= 86400,
      endWord: x.E >= 86400 ? 'נגמר מחר' : 'נגמר',
      cta: x.cta,
      p0: pos(x.S),
      p1: pos(x.E),
      ...icons(x.kind),
      cls: s.marking === x.id ? 'marking' : '',
      isMarking: s.marking === x.id,
      mark: () => this.mark(x.id),
      markLabel: x.cta + ' — סימון ' + x.name,
      open: () => this.showToast({ text: 'פותח את נוסח ' + x.short + '…' }),
    });
    const activeOf = (x) => {
      const rem = x.E - t;
      const mins = Math.max(0, Math.ceil(rem / 60));
      const pctLeft = Math.round(Math.max(0, Math.min(1, rem / (x.E - x.S))) * 100);
      return {
        ...base(x),
        left: this.left(rem),
        leftShort: this.hm(rem),
        leftNum: mins < 60 ? String(mins) : Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0'),
        leftUnit: mins < 60 ? 'דקות' : 'שעות',
        pctLeft,
        pctGone: 100 - pctLeft,
        urgent: mins <= 45,
        urgentCls: mins <= 45 ? 'urgent' : '',
        focus: () => this.setState({ focus: x.id }),
        focusLabel: 'העבר למוקד: ' + x.name,
      };
    };

    const active = all.filter((x) => statusOf(x) === 'active').sort((a, b) => a.E - b.E).map(activeOf);
    const missed = all
      .filter((x) => statusOf(x) === 'missed')
      .sort((a, b) => b.E - a.E)
      .map((x) => ({ ...base(x), ago: 'הזמן עבר ב-' + this.clock(x.E), markLabel: 'בכל זאת עשיתי — סימון ' + x.name }));
    const upcoming = all
      .filter((x) => statusOf(x) === 'upcoming')
      .sort((a, b) => a.S - b.S)
      .map((x) => ({ ...base(x), inText: 'בעוד ' + this.left(x.S - t), inShort: this.hm(x.S - t) }));
    const done = all
      .filter((x) => statusOf(x) === 'done')
      .sort((a, b) => this.doneAt(a.id) - this.doneAt(b.id))
      .map((x) => {
        const d = this.doneAt(x.id);
        return { ...base(x), at: this.clock(d), late: d >= x.E, undo: () => this.undo(x.id), undoLabel: 'ביטול הסימון של ' + x.name };
      });
    const statusText = { done: 'בוצע', missed: 'פוספס', active: 'פתוח עכשיו', upcoming: 'בהמשך' };
    const timeline = all.map((x) => {
      const st = statusOf(x);
      const d = this.doneAt(x.id);
      return {
        ...base(x),
        status: st,
        statusText: st === 'done' ? 'בוצע ב-' + this.clock(d) : st === 'active' ? 'פתוח · נשארו ' + this.left(x.E - t) : st === 'upcoming' ? 'נפתח ב-' + this.clock(x.S) : 'פוספס · נגמר ב-' + this.clock(x.E),
        statusShort: statusText[st],
        isDone: st === 'done',
        isMissed: st === 'missed',
        isActive: st === 'active',
        isUpcoming: st === 'upcoming',
        at: d != null ? this.clock(d) : '',
        undo: () => this.undo(x.id),
      };
    });

    const hero = active.find((x) => x.id === s.focus) || active[0] || null;
    const focusId = hero ? hero.id : upcoming[0] ? upcoming[0].id : null;
    const pv = this.personalVals(focusId);

    const zl = this.zmanimList();
    const nextZ = zl.find((z) => z.S > t) || null;
    const zmanim = zl.map((z) => ({
      id: z.id,
      name: z.name,
      short: z.short,
      time: z.t,
      p: pos(z.S),
      past: z.S <= t,
      isNext: Boolean(nextZ && z.id === nextZ.id),
      cls: nextZ && z.id === nextZ.id ? 'next' : z.S <= t ? 'past' : '',
      isDawn: z.kind === 'dawn',
      isRise: z.kind === 'rise',
      isDay: z.kind === 'day',
      isSet: z.kind === 'set',
      isNight: z.kind === 'night',
    }));
    const nz = nextZ ? { name: nextZ.name, short: nextZ.short, time: nextZ.t, left: 'בעוד ' + this.left(nextZ.S - t), leftShort: this.hm(nextZ.S - t) } : { name: 'עלות השחר מחר', short: 'עלות', time: this.clock(day.nextAlot * 60), left: 'בעוד ' + this.left(day.nextAlot * 60 - t), leftShort: this.hm(day.nextAlot * 60 - t) };

    const shkia = day.z.shkia * 60;
    const heb = t >= shkia ? day.hebNight : day.hebDay;
    const holy = this.holyAt(tn.date, t);
    const part = this.pPart(t);
    const msgDefs = [
      { id: 'next', kind: 'personal', icon: 'bell', tag: 'אישי', title: 'ההתראה הבאה · ' + pv.pLineTitle, body: pv.pLine, action: 'עריכה', act: pv.openPersonal, fixed: true },
      { id: 'streak', kind: 'personal', icon: 'flame', tag: 'אישי', title: '12 ימים ברצף', body: (name ? name + ', ' : '') + 'עוד יום אחד ו' + (f ? 'את' : 'אתה') + ' בשיא חדש.', action: '', act: null },
      ...this.generalMsgs(tn.date, t).map((m) => ({ ...m, act: m.action ? () => this.showToast({ text: 'פותח את ' + m.title + '…' }) : null })),
      { id: 'update', kind: 'system', icon: 'update', tag: 'עדכון', title: 'גרסה חדשה מוכנה', body: 'שיפורים במסך הבית. נכנסת לתוקף בפתיחה הבאה.', action: 'הפעלה מחדש', act: () => this.showToast({ text: 'מפעיל מחדש…' }) },
    ];
    const messages = msgDefs
      .filter((m) => !s.gone[m.id])
      .map((m) => ({
        id: m.id,
        tag: m.tag,
        title: m.title,
        body: m.body,
        hasAction: Boolean(m.act),
        action: m.action,
        act: m.act || (() => {}),
        canDismiss: !m.fixed,
        dismiss: () => this.dismissMsg(m.id, m.title),
        dismissLabel: 'הסתרת ההודעה: ' + m.title,
        isPersonal: m.kind === 'personal',
        isGeneral: m.kind === 'general',
        isSystem: m.kind === 'system',
        kindCls: m.kind,
        cls: s.leaving === m.id ? 'leaving' : '',
        isBell: m.icon === 'bell',
        isFlame: m.icon === 'flame',
        isStar: m.icon === 'star',
        isCandle: m.icon === 'candle',
        isMoon: m.icon === 'moon',
        isUpdate: m.icon === 'update',
        isCalendar: m.icon === 'calendar',
      }));
    const msgPersonal = messages.filter((m) => m.isPersonal);
    const msgGeneral = messages.filter((m) => !m.isPersonal);
    const next = upcoming[0];
    const n = all.length;

    return {
      ...pv,
      theme,
      phCls: 't-' + theme + (big ? ' big' : '') + (tall ? ' tall' : ''),
      isNight: t >= day.z.tzeit * 60 || t < day.z.alot * 60,
      nowT: this.clock(t),
      nowPos: pos(t),
      name,
      greeting: name ? part + ', ' + name : part,
      greetPart: part,
      weekday: day.weekday,
      hebDate: heb + ' ' + day.hebYear,
      hebDay: heb,
      gregDate: day.greg,
      gregShort: day.gregShort,
      parasha: day.parasha,
      city: this.data().city,
      dateLine: day.weekday + ' · ' + heb + ' · ' + this.data().city,
      dateKey: tn.date,
      mode: tn.mode,
      isLive: tn.mode === 'live',
      isScrub: tn.mode === 'scrub',
      isPeek: tn.peek,
      nowSec: t,
      liveSec: this.liveSec(),
      dayStartSec: AX0,
      dayEndSec: this.dayEnd(),
      showBack: tn.mode === 'scrub' || tn.peek,
      backLabel: tn.key.startsWith('live') ? 'חזרה לעכשיו' : 'חזרה ל-' + tn.key.slice(0, 5),
      scrubLabel: (tn.peek && tn.mode !== 'scrub' ? 'יום חול לדוגמה · ' : tn.peek ? 'יום חול לדוגמה · ' : 'תצוגה של ') + this.clock(t),
      back: () => this.goLive(),
      isHoly: Boolean(holy),
      holyTitle: holy ? holy.title : '',
      holyBody: holy ? 'צאת ' + (holy.title.startsWith('שבת') ? 'השבת' : 'החג') + ' ב-' + this.clock(holy.exit * 60) : '',
      holyPeek: () => this.peekWeekday(),
      streak: 12,
      zmanim,
      nextZ: nz,
      messages,
      msgPersonal,
      msgGeneral,
      hasMessages: messages.length > 0,
      hasMsgGeneral: msgGeneral.length > 0,
      msgCount: messages.length,
      active,
      hasActive: active.length > 0,
      noActive: active.length === 0,
      hero: hero || {},
      hasHero: Boolean(hero),
      heroAnim: 'enter-' + this.flip('hero', hero ? hero.id : ''),
      rest: active.filter((x) => !hero || x.id !== hero.id),
      hasRest: active.length > 1,
      upcoming,
      hasUpcoming: upcoming.length > 0,
      done,
      hasDone: done.length > 0,
      noDone: done.length === 0,
      missed,
      hasMissed: missed.length > 0,
      noMissed: missed.length === 0,
      timeline,
      doneN: done.length,
      missedN: missed.length,
      activeN: active.length,
      upcomingN: upcoming.length,
      totalN: n,
      donePct: Math.round((done.length / n) * 100),
      countText: done.length + '/' + n,
      countLabel: done.length + ' מתוך ' + n + ' בוצעו היום',
      activeEmptyTitle: missed.length || upcoming.length ? 'אין מצווה פתוחה עכשיו' : 'הכול סומן להיום',
      activeEmptyText: next ? 'הבאה: ' + next.short + ' ב-' + next.startT + ' · ' + next.inText : 'נתראה מחר בבוקר',
      doneEmpty: 'עוד לא סימנת היום.',
      missedEmpty: (name ? name + ', ' : '') + 'לא פספסת כלום היום.',
      hasToast: Boolean(s.toast),
      toastText: s.toast ? s.toast.text : '',
      toastUndo: Boolean(s.toast && (s.toast.undoId || s.toast.msgId)),
      toastCls: this.toastFlip ? 'ta' : 'tb',
      undoToast: () => {
        if (!s.toast) return;
        if (s.toast.undoId) this.undo(s.toast.undoId);
        if (s.toast.msgId) this.restoreMsg(s.toast.msgId);
      },
    };
  }
