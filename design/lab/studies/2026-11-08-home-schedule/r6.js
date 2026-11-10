  // Round 6 (2026-11-09): one carousel, one line, nothing twice. The owner: "בצורה חכמה שמשתנה בהתאם לתקופה, יום
  // או שבוע ... מה שבוחר המשתמש ... קרוסלת הזמנים שכבר קיימת ... ללא כפילויות וחיסכון במקום".
  // The rule every board keeps: a time is printed once. The carousel holds every time of the day (the zmanim, the
  // times the period adds, the user's pins), upcoming first and the past after them; the smart line holds only the
  // day and the week (what kind of day it is, what comes this week), never a time the carousel already prints.
  r6Vals(zchips, kit, plan) {
    const s = this.state;
    const t = this.now();
    const D = this.data();
    const key = this.dayKey();
    const day = this.day();
    const z = day.z;
    const clock = (sec) => this.clock(sec);
    const ui = s.ui || {};
    const setUi = (k, v) => () => this.setState({ ui: { ...(this.state.ui || {}), [k]: typeof v === 'function' ? v((this.state.ui || {})[k]) : v } });
    const pins = s.pins || ['misheyakir'];
    const cat = this.boardCatalog();
    const wdShort = (k) => (D.days[k] ? D.days[k].weekday.replace('יום ', '') : '');

    // The smart line: what the day is, then what the week holds. Each entry once, the most relevant first.
    const ctx = [];
    const push = (kicker, text, icon, tone = '') => ctx.push({ kicker, text, icon, tone });
    // A segment that names a time the carousel prints today is dropped, so no time is shown twice.
    const shown = new Set([...zchips.map((c) => c.time), ...plan.items.filter((x) => x.season).map((x) => x.time)]);
    const lean = (text) => text.split(' · ').filter((seg, i) => i === 0 || !(seg.match(/\d\d:\d\d/g) || []).some((m) => shown.has(m))).join(' · ');
    const short = (title) => title.replace('שבת פרשת ', 'שבת ');
    const erevB = D.blocks.find((b) => b.erev === key);
    // Shabbat's entry shows from Thursday night only (the owner's word of 2026-11-09).
    const thuNight = t >= z.tzeit * 60;
    for (const b of plan.badges.filter((x) => !/^מחר ערב שבת/.test(x.text) || thuNight)) {
      const icon = b.isCandle ? 'candle' : b.isStar ? 'star' : b.isMoon ? 'moon' : 'cal';
      const kick = /(^|· )(מחר|בעוד)|נפתח ביום/.test(b.text) ? 'השבוע' : 'היום';
      let text = b.text.replace(/^היום /, '');
      if (erevB && /^ערב שבת/.test(b.text)) text = 'ערב ' + short(erevB.title) + ' · יציאה מחר ' + clock(erevB.exit * 60);
      push(kick, kick === 'היום' ? lean(text) : text, icon, b.tone);
    }
    let shab = null;
    for (let i = 0; i < 8 && !shab; i++) {
      const b = D.blocks.find((x) => x.erev === this.shiftDate(key, i));
      if (b) shab = { ...b, inDays: i };
    }
    if (shab && shab.inDays === 1 && thuNight && !plan.badges.some((b) => /ערב שבת/.test(b.text))) push('השבוע', short(shab.title) + ' · הדלקה ב' + wdShort(shab.erev) + ' ' + clock(shab.candle * 60), 'candle');
    const hil = [...(day.hilulaToday || []), ...(day.hilulaTonight || [])];
    if (hil.length) push(day.hilulaToday.length ? 'היום' : 'הלילה', 'הילולת ' + hil.join(' ו'), 'flame');
    // The season's words in the Amidah (in Israel, from 7 Cheshvan to Pesach; every day of this study's data is inside it).
    push('התקופה', /חשון|כסלו|טבת|שבט|אדר/.test(day.hebLbl) ? 'בתפילה: משיב הרוח ומוריד הגשם · ותן טל ומטר' : 'בתפילה: מוריד הטל · ותן ברכה', 'cal');
    if (!ctx.some((c) => c.kicker === 'השבוע')) push('השבוע', day.parasha, 'cal');
    const RANK = { 'היום': 0, 'הלילה': 0, 'השבוע': 1, 'התקופה': 2 };
    ctx.sort((a, b) => RANK[a.kicker] - RANK[b.kicker]);
    const ci = (ui.r6ctx || 0) % ctx.length;
    const icFlags = (icon) => ({ isCandle: icon === 'candle', isStar: icon === 'star', isMoon: icon === 'moon', isCal: icon === 'cal' || icon === 'flame' });
    const ctxItems = ctx.map((c, i) => ({ ...c, ...icFlags(c.icon), on: i === ci, cls: i === ci ? 'on' : '', pick: setUi('r6ctx', i) }));
    const cur = ctxItems[ci];

    // The carousel: the day's zmanim, the times the period adds and the user's pins, each once.
    const zS = (id) => (z[id] != null ? z[id] * 60 : null);
    const base = zchips.map((c) => ({ id: c.id, label: c.label.replace(/^הבא · /, ''), time: c.time, S: zS(c.id), pick: c.pick, aria: c.aria }));
    const SHORT = { candle: 'הדלקת נרות', chanukah: 'נרות חנוכה', fastEnd: 'סוף הצום', exit: 'צאת השבת', kl: 'קידוש לבנה' };
    const extra = plan.items.filter((x) => x.season).map((x) => ({ id: x.id, label: SHORT[x.id] || x.title.replace(/ · .*/, ''), time: x.time, S: x.S, pick: x.pick, aria: x.title + ' ' + x.time, season: true, sub: x.title.includes(' · ') ? x.title.split(' · ')[1] : '' }));
    if (pins.includes('sofShmaMA')) base.push({ id: 'sofShmaMA', label: 'ק״ש מג״א', time: clock(zS('sofShmaMA')), S: zS('sofShmaMA'), pick: () => this.scrub(zS('sofShmaMA')), aria: 'סוף זמן קריאת שמע לפי המג״א ' + clock(zS('sofShmaMA')) });
    const week = [];
    const cw = cat.find((c) => c.id === 'candleWeek');
    if (pins.includes('candleWeek') && cw && cw.sub !== 'היום') week.push({ id: 'candleWeek', label: 'הדלקה · ' + cw.sub, time: clock(cw.m * 60), S: cw.m * 60, pick: () => this.showToast({ text: 'הדלקת נרות ביום ' + cw.sub + ' ' + clock(cw.m * 60) }), aria: 'הדלקת נרות ביום ' + cw.sub + ' ' + clock(cw.m * 60), week: true });
    const all = [...base, ...extra].filter((x) => x.S != null);
    const lead = SCHED === 't' ? plan.future.slice().sort((a, b) => b.score - a.score || a.S - b.S).find((x) => x.S <= plan.horizonEnd || x.season) || plan.future[0] || null : null;
    const leadKey = lead ? (lead.zid || lead.id) : null;
    const up = all.filter((x) => x.S > t && x.id !== leadKey).sort((a, b) => a.S - b.S);
    const past = all.filter((x) => x.S <= t && x.id !== leadKey).sort((a, b) => a.S - b.S);
    const chip = (x, i, kind) => {
      const pinned = pins.includes(x.id);
      const isPast = kind === 'past';
      const cls = ['k6', x.season ? 'k-season' : '', pinned ? 'k-pin' : '', isPast ? 'k-past' : '', kind === 'up' && i === 0 && !lead ? 'mk' : '', x.week ? 'k-week' : ''].filter(Boolean).join(' ');
      return {
        id: x.id,
        label: x.label,
        time: x.time,
        cls,
        tcls: isPast ? '' : 'b',
        pressed: false,
        ink: x.season && !isPast ? kit.inkNext : kit.inkPlain,
        style: x.season && !isPast ? kit.nextBg : kit.plainBg,
        aria: x.aria + (pinned ? ', בחרת להציג' : '') + (isPast ? ', עבר' : ''),
        pick: x.pick,
      };
    };
    const sep = (label) => ({ id: 'sep-' + label, label, time: '', cls: 'k-sep', tcls: '', pressed: false, ink: kit.inkPlain, style: '', aria: label, pick: () => {} });
    const add = { id: 'add', label: 'שלי', time: '+', cls: 'k-add', tcls: 'b', pressed: false, ink: kit.inkPlain, style: kit.plainBg, aria: 'בחירת הזמנים שלי', pick: () => this.setState({ pinSheet: true }) };
    const chips = [];
    if (lead) {
      const prev = [...all].filter((x) => x.S <= t).map((x) => x.S).sort((a, b) => b - a)[0] || this.dayStart();
      const pct = Math.max(0.04, Math.min(1, 1 - (lead.S - t) / Math.max(1800, lead.S - prev)));
      const fill = 'linear-gradient(to left, color-mix(in srgb, var(--gold) 34%, transparent) ' + (pct * 100).toFixed(1) + '%, transparent ' + (pct * 100).toFixed(1) + '%)';
      const label = (SHORT[lead.id] || lead.title.replace(/ · .*/, '')) + ' · ' + lead.left;
      chips.push({ id: 'live', label, time: lead.time, cls: 'k6 k-live mk', tcls: 'b', pressed: false, ink: kit.inkNext, style: kit.nextBg.replace(/;?$/, '') + '; background-image: ' + fill, aria: label + ', ' + lead.time + (lead.why ? ', ' + lead.why : ''), pick: lead.pick });
    }
    up.forEach((x, i) => chips.push(chip(x, i, 'up')));
    if (week.length) { chips.push(sep('השבוע')); week.forEach((x, i) => chips.push(chip(x, i, 'up'))); }
    const tomK = this.shiftDate(key, 1);
    const tom = D.days[tomK];
    if (tom && t >= z.tzeit * 60 && SCHED !== 'u') {
      chips.push(sep('מחר'));
      for (const x of this.zmanimList().filter((x) => ['misheyakir', 'netz', 'sofShma', 'sofTfila'].includes(x.id))) {
        const tt = clock(tom.z[x.id] * 60);
        chips.push({ id: 'tom-' + x.id, label: x.short, time: tt, cls: 'k6 k-tom' + (pins.includes(x.id) ? ' k-pin' : ''), tcls: 'b', pressed: false, ink: kit.inkPlain, style: kit.plainBg, aria: x.name + ' מחר ' + tt, pick: () => this.showToast({ text: x.name + ' מחר: ' + tt }) });
      }
    }
    if (past.length) { chips.push(sep('מוקדם יותר')); past.forEach((x, i) => chips.push(chip(x, i, 'past'))); }
    chips.push(add);

    // The week strip (u): the seven days of this week, a mark on each day that carries something.
    const wd = D.days[key] ? D.days[key].wd : 0;
    const sun = this.shiftDate(key, -wd);
    const sel = ui.r6day && D.days[ui.r6day] ? ui.r6day : key;
    const marks = (k) => {
      const out = [];
      const erev = D.blocks.find((b) => b.erev === k);
      const end = D.blocks.find((b) => b.end === k);
      const ev = D.events.filter((e) => e.d === k);
      if (erev) out.push({ icon: 'candle', text: 'הדלקת נרות ' + clock(erev.candle * 60) });
      if (end) out.push({ icon: 'star', text: (end.kind === 'shabbat' ? 'צאת השבת ' : 'צאת החג ') + clock(end.exit * 60) });
      for (const e of ev) if (e.rc) out.push({ icon: 'moon', text: e.title });
      for (const e of ev) if (e.chanukah) out.push({ icon: 'candle', text: e.title.replace(/^חנוכה: /, 'חנוכה · ') });
      for (const e of ev) if (e.fast) out.push({ icon: 'star', text: e.title + ' · עד ' + clock((D.days[k] ? D.days[k].z.tzeitTaanit : 0) * 60) });
      if (D.days[k] && D.days[k].win && D.days[k].win.kiddush_levana) out.push({ icon: 'moon', text: 'קידוש לבנה נפתח' });
      return out;
    };
    const LETTER = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    const days = Array.from({ length: 7 }, (_, i) => {
      const k = this.shiftDate(sun, i);
      const m = marks(k);
      const d = D.days[k];
      return {
        k,
        letter: LETTER[i],
        heb: d ? d.hebDay.split(' ')[0] : '',
        dot: m.length > 0,
        dotCls: m.length ? 'dot ' + (m[0].icon === 'candle' ? 'gold' : m[0].icon === 'moon' ? 'moon' : 'star') : '',
        cls: (k === sel ? 'sel' : '') + (k === key ? ' today' : '') + (k < key ? ' gone' : ''),
        sel: k === sel,
        aria: (d ? d.weekday + ', ' + d.hebDay : '') + (m.length ? ', ' + m.map((x) => x.text).join(', ') : '') + (k === key ? ', היום' : ''),
        pick: setUi('r6day', k === key ? null : k),
      };
    });
    const selDay = D.days[sel];
    const selMarks = marks(sel);
    const otherDay = sel !== key;
    let weekChips = chips;
    if (SCHED === 'u' && otherDay && selDay) {
      const Z = this.zmanimList().filter((x) => selDay.z[x.id] != null);
      weekChips = [
        ...selMarks.filter((m) => /\d\d:\d\d/.test(m.text)).map((m) => ({ id: 'm' + m.text, label: m.text.replace(/ \d\d:\d\d.*/, ''), time: m.text.match(/\d\d:\d\d/)[0], cls: 'k6 k-season', tcls: 'b', pressed: false, ink: kit.inkNext, style: kit.nextBg, aria: m.text, pick: () => {} })),
        ...Z.map((x) => ({ id: x.id, label: x.short, time: clock(selDay.z[x.id] * 60), cls: 'k6' + (pins.includes(x.id) ? ' k-pin' : ''), tcls: 'b', pressed: false, ink: kit.inkPlain, style: kit.plainBg, aria: x.name + ' ' + clock(selDay.z[x.id] * 60) + ', ' + selDay.weekday, pick: () => this.showToast({ text: x.name + ' ב' + selDay.weekday + ': ' + clock(selDay.z[x.id] * 60) }) })),
      ];
    }

    // The smart stack (s): the day, the week and mine, one card at a time.
    const minePins = pins.map((id) => cat.find((c) => c.id === id)).filter(Boolean);
    const dayCtx = [...ctx.filter((c) => c.kicker === 'היום' || c.kicker === 'הלילה'), ...ctx.filter((c) => c.kicker === 'התקופה')];
    const weekCtx = ctx.filter((c) => c.kicker === 'השבוע');
    const pages = [
      { id: 'day', name: 'היום', title: dayCtx[0] ? dayCtx[0].text.split(' · ')[0] : day.weekday + ' · ' + day.hebDay, sub: dayCtx[0] ? dayCtx[0].text.split(' · ').slice(1).join(' · ') || plan.cur.name + ' · ' + plan.cur.endsLine : plan.cur.name + ' · ' + plan.cur.endsLine, icon: dayCtx[0] ? dayCtx[0].icon : 'cal' },
      { id: 'week', name: 'השבוע', title: weekCtx[0] ? weekCtx[0].text.split(' · ')[0] : day.parasha, sub: weekCtx[0] ? weekCtx[0].text.split(' · ').slice(1).join(' · ') : '', icon: weekCtx[0] ? weekCtx[0].icon : 'cal' },
      { id: 'mine', name: 'שלי', title: minePins.length ? minePins.map((c) => c.label).join(' · ') : 'עוד לא בחרת זמנים', sub: minePins.length ? 'מסומנים בכוכב בקרוסלה' : 'הזמנים שתבחר יסומנו בכוכב', icon: 'star' },
    ];
    const autoPage = ctx[0].kicker === 'השבוע' ? 'week' : 'day';
    const page = ui.r6page || autoPage;
    const pi = pages.findIndex((p) => p.id === page);
    const stack = pages.map((p, i) => ({ ...p, ...icFlags(p.icon), on: i === pi, cls: i === pi ? 'on' : i < pi ? 'above' : 'below', pick: setUi('r6page', p.id), hasSub: Boolean(p.sub) }));

    const heroCls = { q: 'r6 r6q', r: 'r6 r6r', s: 'r6 r6s', t: 'r6 r6t', u: 'r6 r6u', v: 'r6 r6v' }[SCHED];
    const out = {
      heroCls,
      zchips: SCHED === 'u' ? weekChips : chips,
      r6: { cur: cur, ctx: ctxItems, many: ctxItems.length > 1, count: ctxItems.length, idx: ci + 1, next: setUi('r6ctx', (v) => ((v || 0) + 1) % ctx.length), aria: cur.kicker + ': ' + cur.text + (ctxItems.length > 1 ? ', ' + (ci + 1) + ' מתוך ' + ctxItems.length + ', לחיצה לבא' : '') },
      r6Days: days,
      r6On: { line: SCHED === 'q' || SCHED === 'r' },
      r6Sel: { title: selDay ? selDay.weekday + ' · ' + selDay.hebDay : '', lines: selMarks.length ? selMarks.map((m) => m.text).join(' · ') : 'יום רגיל, בלי זמנים מיוחדים', other: otherDay, today: !otherDay, back: setUi('r6day', null) },
      r6Stack: stack,
      r6Page: stack[pi],
      r6PageNext: setUi('r6page', pages[(pi + 1) % pages.length].id),
    };
    if (SCHED === 't') out.midCaption = cur.text;
    return out;
  }
