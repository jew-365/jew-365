
  // The smart schedule: which times matter now, from the day's zmanim, the app's mitzvah windows
  // (data.json `win`, dayWindow() over MITZVOT), the holy blocks and the calendar's events.
  schedPlan() {
    const D = this.data();
    const key = this.dayKey();
    const day = this.day();
    const z = day.z;
    const t = this.now();
    const W = day.win || {};
    const clock = (sec) => this.clock(sec);
    const erev = D.blocks.find((b) => b.erev === key) || null;
    const motzash = D.blocks.find((b) => b.end === key) || null;
    const exitMin = motzash ? motzash.exit : null;
    const evToday = D.events.filter((e) => e.d === key);
    const chanukahTonight = evToday.find((e) => e.chanukah && /נר/.test(e.title));
    const fast = evToday.find((e) => e.fast);
    const wdName = (k) => D.days[k] ? D.days[k].weekday.replace('יום ', '') : '';

    let kl = null;
    for (let i = 0; i <= 16; i++) {
      const k = this.shiftDate(key, -i);
      const w = D.days[k] && D.days[k].win.kiddush_levana;
      if (!w) continue;
      const off = this.daysBetween(key, k) * 1440;
      const S = (w[0] + off) * 60;
      const E = (w[1] + off) * 60;
      const endKey = this.shiftDate(key, Math.floor(E / 86400));
      const endDay = D.days[endKey];
      const nightKey = endDay && E % 86400 >= endDay.z.tzeit * 60 ? endKey : this.shiftDate(endKey, -1);
      const lastNight = wdName(nightKey) + (D.days[nightKey] ? ', ' + D.days[nightKey].gregShort : '');
      if (E > t) kl = { S, E, lastNight };
      break;
    }
    if (!kl) {
      for (let i = 1; i <= 2; i++) {
        const k = this.shiftDate(key, i);
        const w = D.days[k] && D.days[k].win.kiddush_levana;
        if (w) kl = { S: (w[0] + i * 1440) * 60, E: (w[1] + i * 1440) * 60, soonDay: wdName(k) };
      }
    }

    const done = (id) => this.doneAt(id) != null;
    const A = [];
    const add = (id, m, title, sub, o = {}) => m != null && A.push({ id, S: m * 60, title, sub, ...o });
    const holyNow = (m) => this.holyAt(key, m * 60);
    add('misheyakir', z.misheyakir, 'זמן תו״ט', 'מתחילים טלית ותפילין', { starts: 'tefillin', icon: 'dawn', zid: 'misheyakir' });
    add('netz', z.netz, 'הנץ החמה', 'מתחילים שחרית וקריאת שמע', { starts: 'shacharit', icon: 'rise', zid: 'netz' });
    add('sofShma', z.sofShma, 'סוף זמן ק״ש', (z.sofShmaMA * 60 <= t ? 'לפי המג״א עבר ב-' : 'לפי המג״א ') + clock(z.sofShmaMA * 60), { ends: 'shma', icon: 'day', zid: 'sofShma' });
    add('sofTfila', z.sofTfila, 'סוף זמן תפילה', 'אחרון לשחרית', { ends: 'shacharit', icon: 'day', zid: 'sofTfila' });
    add('chatzot', z.chatzot, 'חצות היום', '', { icon: 'day', zid: 'chatzot' });
    add('minchaG', z.minchaG, 'מנחה גדולה', 'אפשר להתפלל מנחה', { starts: 'mincha', icon: 'day', zid: 'minchaG' });
    add('plag', z.plag, 'פלג המנחה', erev ? 'מכאן אפשר לקבל שבת' : '', { icon: 'day', zid: 'plag' });
    if (chanukahTonight && W.chanukah_candles) {
      const n = chanukahTonight.title.replace(/^חנוכה: /, '');
      add('chanukah', W.chanukah_candles[0], 'נרות חנוכה · ' + n, erev ? 'לפני הדלקת נרות שבת · עד ' + clock(W.chanukah_candles[1] * 60) : 'מצאת הכוכבים', { season: true, icon: 'candle' });
    }
    if (erev) {
      add('candle', erev.candle, 'הדלקת נרות שבת', 'כניסת ' + erev.title + ' · צאת השבת ' + clock(erev.exit * 60), { season: true, icon: 'candle' });
    } else {
      if (!holyNow(z.shkia)) add('shkia', z.shkia, 'שקיעה', 'אחרון למנחה ולתפילין', { ends: 'mincha', icon: 'set', zid: 'shkia' });
      if (fast) add('fastEnd', z.tzeitTaanit, 'סוף הצום', fast.title, { season: true, icon: 'star' });
      if (motzash) add('exit', exitMin, 'צאת השבת', 'הבדלה וערבית של מוצאי שבת', { season: true, icon: 'star', starts: 'maariv' });
      else add('tzeit', z.tzeit, 'צאת הכוכבים', 'ערבית וקריאת שמע על המיטה', { starts: 'maariv', icon: 'night', zid: 'tzeit' });
      if (kl && kl.S > t && kl.S < day.nextAlot * 60) add('kl', kl.S / 60, 'קידוש לבנה נפתח', 'הלילה הראשון · עד ליל ' + (kl.lastNight || ''), { season: true, icon: 'moon' });
      add('chatzotL', z.chatzotL, 'חצות הלילה', 'לכתחילה ערבית וק״ש עד כאן', { ends: 'shmaNight', soft: true, icon: 'night', zid: 'chatzotL' });
      add('alot', day.nextAlot, 'עלות השחר', 'סוף זמן ערבית · יום חדש', { ends: 'maariv', icon: 'dawn' });
    }
    A.sort((a, b) => a.S - b.S);

    const blockStart = erev ? erev.candle : null;
    const P = [
      { id: 'dawn', name: 'שחר', from: z.alot, to: z.netz, icon: 'dawn' },
      { id: 'morning', name: 'בוקר', from: z.netz, to: z.chatzot, icon: 'rise' },
      { id: 'noon', name: 'צהריים', from: z.chatzot, to: z.plag, icon: 'day' },
      { id: 'evening', name: erev ? 'ערב שבת' : 'ערב', from: z.plag, to: erev ? blockStart : motzash ? exitMin : z.tzeit, icon: 'set' },
      { id: 'night', name: motzash ? 'מוצאי שבת' : chanukahTonight ? 'ליל חנוכה' : 'לילה', from: motzash ? exitMin : z.tzeit, to: day.nextAlot, icon: 'night' },
    ].filter((p) => !(erev && p.id === 'night')).map((p) => ({ ...p, S: p.from * 60, E: p.to * 60 }));
    const cur = P.find((p) => t >= p.S && t < p.E) || P[P.length - 1];
    const ci = P.indexOf(cur);
    const EDGE = { dawn: 'הנץ', morning: 'חצות', noon: 'פלג', evening: erev ? 'הדלקה' : motzash ? 'צאת השבת' : 'צאה״כ', night: 'עלות' };
    const ends = (p) => 'עד ' + EDGE[p.id] + ' ' + clock(p.E);

    const item = (a) => {
      const st = a.ends && done(a.ends) ? 'done' : a.S <= t ? 'past' : 'up';
      const mins = (a.S - t) / 60;
      const deadline = a.ends && !done(a.ends) && st === 'up';
      const urgent = deadline && mins <= 45;
      let score = a.season ? 5 : deadline ? (urgent ? 6 : 4) : a.starts && !done(a.starts) ? 3 : 1;
      if (a.soft) score = Math.min(score, 2);
      if (st === 'done') score = 0;
      const left = st === 'up' ? 'בעוד ' + this.leftText(a.S - t) : st === 'done' ? 'סומן' : 'עבר';
      const why = st === 'done' ? (a.ends === 'shma' ? 'קראת ✓' : a.ends === 'mincha' ? 'התפללת מנחה ✓' : 'סומן ✓') : a.sub;
      return {
        ...a,
        st,
        score,
        urgent,
        time: clock(a.S),
        left,
        why,
        hasWhy: Boolean(why),
        cls: [st === 'up' ? '' : 'muted', urgent ? 'urgent' : '', a.season ? 'season' : '', st === 'done' ? 'done' : ''].join(' ').trim(),
        isDawn: a.icon === 'dawn', isRise: a.icon === 'rise', isDay: a.icon === 'day', isSet: a.icon === 'set', isNight: a.icon === 'night', isCandle: a.icon === 'candle', isStar: a.icon === 'star', isMoon: a.icon === 'moon',
        aria: a.title + ' ' + clock(a.S) + ', ' + left + (why ? ', ' + why : ''),
        pick: () => this.scrub(a.S),
      };
    };
    const items = A.map(item);
    const future = items.filter((x) => x.st === 'up');
    const horizonEnd = (P[ci + 1] || cur).E;
    const pool = future.filter((x) => x.S <= horizonEnd || x.season);
    const pick = (n) => {
      const keep = new Set(pool.slice().sort((a, b) => b.score - a.score || a.S - b.S).slice(0, n).map((x) => x.id));
      for (const x of future) if (keep.size < n && !keep.has(x.id)) keep.add(x.id);
      return future.filter((x) => keep.has(x.id));
    };

    const badges = [];
    const badge = (text, icon, tone = '') => badges.push({ text, tone, isCandle: icon === 'candle', isStar: icon === 'star', isMoon: icon === 'moon', isCal: icon === 'cal' });
    if (erev) badge('ערב שבת · הדלקה ' + clock(erev.candle * 60), 'candle', 'gold');
    else {
      const tom = D.blocks.find((b) => b.erev === this.shiftDate(key, 1));
      if (tom && t >= z.chatzot * 60) badge('מחר ערב שבת · הדלקה ' + clock(tom.candle * 60), 'candle');
    }
    if (motzash && t >= exitMin * 60) badge('מוצאי ' + motzash.title, 'star', 'gold');
    if (chanukahTonight) badge('חנוכה · ' + chanukahTonight.title.replace(/^חנוכה: /, '') + ' הערב', 'candle', 'gold');
    const rcToday = evToday.find((e) => e.rc);
    if (rcToday) badge('היום ' + rcToday.title + ' · יעלה ויבוא והלל', 'moon', 'gold');
    else {
      const rc = D.events.find((e) => e.rc && e.d > key && this.daysBetween(key, e.d) <= 3);
      if (rc) {
        const n = this.daysBetween(key, rc.d);
        const when = n === 1 ? (t >= z.shkia * 60 ? 'נכנס הערב' : 'מחר') : 'בעוד ' + n + ' ימים';
        badge(rc.title + ' · ' + when, 'moon');
      }
    }
    if (fast) badge(fast.title + ' · צום עד ' + clock(z.tzeitTaanit * 60), 'star', 'gold');
    if (kl && kl.S <= t) badge('קידוש לבנה פתוח · עד ליל ' + kl.lastNight, 'moon', 'gold');
    else if (kl && kl.soonDay) badge('קידוש לבנה נפתח ביום ' + kl.soonDay, 'moon');

    const periods = P.map((p, i) => {
      const its = items.filter((x) => x.S >= p.S && x.S < p.E + (i === P.length - 1 ? 1 : 0));
      const state = i < ci ? 'past' : i === ci ? 'now' : 'next';
      return {
        ...p,
        state,
        range: clock(p.S) + ' עד ' + clock(p.E),
        endsLine: ends(p),
        items: its,
        count: its.length,
        brief: its.filter((x) => x.score >= 2 || x.season).slice(0, 2).map((x) => x.title.replace(/ · .*/, '') + ' ' + x.time).join(' · ') || its.slice(0, 2).map((x) => x.title + ' ' + x.time).join(' · '),
        pct: i < ci ? 100 : i > ci ? 0 : Math.round((100 * (t - p.S)) / Math.max(60, p.E - p.S)),
        isNow: state === 'now',
        isPast: state === 'past',
        isNext: state === 'next',
        isDawn: p.icon === 'dawn', isRise: p.icon === 'rise', isDay: p.icon === 'day', isSet: p.icon === 'set', isNight: p.icon === 'night',
      };
    });
    return { items, future, pick, cur: periods[ci], periods, badges, horizonEnd, t };
  }

  // The board's three layers. FIXED: the times always shown. SMART: what the hour and the period add.
  // MINE: the times the user pinned, chosen from suggestions read off their own mitzvot and marks.
  boardCatalog() {
    const z = this.day().z;
    const D = this.data();
    const key = this.dayKey();
    let fri = null;
    for (let i = 0; i < 7 && !fri; i++) {
      const b = D.blocks.find((x) => x.erev === this.shiftDate(key, i));
      if (b) fri = { m: b.candle + i * 1440, day: i === 0 ? 'היום' : D.days[b.erev].weekday.replace('יום ', '') };
    }
    const on = (id) => this.items().some((x) => x.id === id);
    return [
      { id: 'misheyakir', label: 'זמן תו״ט', m: z.misheyakir, why: on('tefillin') ? 'אתה מניח תפילין' : '', group: 'בוקר' },
      { id: 'sofShmaMA', label: 'סוף ק״ש מג״א', m: z.sofShmaMA, why: on('shma') ? 'קריאת שמע בבוקר מופעלת אצלך' : '', group: 'בוקר' },
      { id: 'sofTfila', label: 'סוף זמן תפילה', m: z.sofTfila, why: on('shacharit') ? 'שחרית מופעלת אצלך' : '', group: 'בוקר' },
      { id: 'alot', label: 'עלות השחר', m: z.alot, why: '', group: 'בוקר' },
      { id: 'chatzot', label: 'חצות היום', m: z.chatzot, why: '', group: 'צהריים' },
      { id: 'minchaG', label: 'מנחה גדולה', m: z.minchaG, why: '', group: 'צהריים' },
      { id: 'plag', label: 'פלג המנחה', m: z.plag, why: on('mincha') ? 'סימנת מנחה אחרי פלג השבוע' : '', group: 'צהריים' },
      { id: 'chatzotL', label: 'חצות הלילה', m: z.chatzotL, why: on('shmaNight') ? 'ק״ש על המיטה מופעלת אצלך' : '', group: 'לילה' },
      { id: 'candleWeek', label: 'הדלקת נרות', m: fri ? fri.m : null, sub: fri ? fri.day : '', why: 'כדי לתכנן את השבוע', group: 'שבוע' },
    ].filter((c) => c.m != null);
  }

  schedVals(zchips, kit) {
    const s = this.state;
    const t = this.now();
    const z = this.day().z;
    const plan = this.schedPlan();
    const clock = (m) => this.clock(m * 60);
    const pins = s.pins || ['misheyakir'];
    const FIXED = [
      { id: 'netz', label: 'הנץ', m: z.netz },
      { id: 'sofShma', label: 'סוף ק״ש', m: z.sofShma },
      { id: 'shkia', label: 'שקיעה', m: z.shkia },
      { id: 'tzeit', label: 'צאה״כ', m: z.tzeit },
    ];
    const nextFixed = FIXED.find((f) => f.m * 60 > t);
    const fixed = FIXED.map((f) => {
      const past = f.m * 60 <= t;
      const isNext = f === nextFixed;
      return { ...f, time: clock(f.m), cls: (past ? 'past' : '') + (isNext ? ' nx' : ''), aria: f.label + ' ' + clock(f.m) + (past ? ', עבר' : isNext ? ', הבא' : ''), pick: () => this.scrub(f.m * 60) };
    });

    const taken = new Set([...FIXED.map((f) => f.id), ...pins]);
    const tagOf = (x) => (x.season ? (x.id === 'candle' ? 'ערב שבת' : x.id === 'chanukah' ? 'חנוכה' : x.id === 'fastEnd' ? 'צום' : x.id === 'exit' ? 'מוצ״ש' : x.id === 'kl' ? 'קידוש לבנה' : 'היום') : plan.cur.name);
    const smartSrc = plan.future.filter((x) => !(x.zid && taken.has(x.zid)) && !taken.has(x.id) && (x.season || x.S <= plan.horizonEnd) && (x.id !== 'alot' || plan.cur.id === 'night'));
    const ranked = smartSrc.slice().sort((a, b) => b.score - a.score || a.S - b.S).slice(0, 2).sort((a, b) => a.S - b.S);
    const smart = ranked.map((x) => ({
      label: x.title.replace(/ · .*/, ''),
      time: x.time,
      tag: tagOf(x),
      cls: (x.season ? 'season' : '') + (x.urgent ? ' urgent' : ''),
      aria: x.title + ' ' + x.time + ', ' + x.left + ', ' + tagOf(x),
      pick: x.pick,
      isTime: true,
    }));
    const info = ranked.some((r) => r.season) ? [] : plan.badges;
    if (smart.length < 3 && info[0]) smart.push({ label: info[0].text.split(' · ')[0], time: info[0].text.split(' · ').slice(1).join(' · '), tag: '', cls: 'info', aria: info[0].text, pick: () => this.showToast({ text: info[0].text }), isTime: false });

    const cat = this.boardCatalog();
    const toggle = (id) => () => this.setState({ pins: pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id] });
    const mine = pins.map((id) => cat.find((c) => c.id === id)).filter(Boolean).map((c) => ({
      label: c.label + (c.sub ? ' · ' + c.sub : ''),
      time: clock(c.m),
      cls: c.m * 60 <= t && c.id !== 'candleWeek' ? 'past' : '',
      aria: c.label + ' ' + clock(c.m) + ', נעוץ על ידך',
      pick: () => (c.id === 'candleWeek' ? this.showToast({ text: 'הדלקת נרות ' + (c.sub || '') + ' ' + clock(c.m) }) : this.scrub(c.m * 60)),
    }));
    const row = (c) => {
      const pinned = pins.includes(c.id);
      return { ...c, time: clock(c.m) + (c.sub ? ' · ' + c.sub : ''), pinned, hasWhy: Boolean(c.why), act: pinned ? 'הסרה' : 'הוספה', aria: (pinned ? 'הסרה מהלוח: ' : 'הוספה ללוח: ') + c.label, toggle: toggle(c.id) };
    };
    const suggested = cat.filter((c) => c.why).map(row);
    const more = cat.filter((c) => !c.why).map(row);

    const out = {
      schedA: SCHED === 'a',
      schedB: SCHED === 'b',
      schedC: SCHED === 'c',
      schedCard: SCHED === 'a',
      openFirstCls: SCHED === 'a' ? '' : 'first',
      bFixed: fixed,
      bSmart: smart,
      bHasSmart: smart.length > 0,
      bMine: mine,
      bHasMine: mine.length > 0,
      bPeriod: plan.cur.name,
      bAdd: () => this.setState({ pinSheet: true }),
      bAddLabel: mine.length ? 'עריכת הזמנים שלי' : 'הוספת זמן ללוח',
      pinOn: Boolean(s.pinSheet),
      pinClose: () => this.setState({ pinSheet: false }),
      pinSuggested: suggested,
      pinMore: more,
    };
    if (SCHED === 'b') {
      const chip = (x, kind) => ({ id: kind + x.label, label: x.label, time: x.time, cls: (kind === 'fixed' && x.cls.includes('nx') ? 'mk ' : '') + 'k-' + kind, tcls: x.cls.includes('past') ? '' : 'b', pressed: false, ink: kind === 'smart' ? kit.inkNext : kit.inkPlain, aria: x.aria, style: kind === 'smart' ? kit.nextBg : kit.plainBg, pick: x.pick });
      out.zchips = [...fixed.map((x) => chip(x, 'fixed')), ...smart.map((x) => chip(x, 'smart')), ...mine.map((x) => chip(x, 'mine')), { id: 'add', label: 'שלי', time: '+', cls: '', tcls: 'b', pressed: false, ink: kit.inkPlain, aria: 'הוספת זמן ללוח', style: kit.plainBg, pick: () => this.setState({ pinSheet: true }) }].map((c, i, a) => (i === a.length - 1 ? { ...c, cls: 'k-add' } : c));
    }
    return out;
  }
