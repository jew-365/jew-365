
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

  schedVals(zchips, kit) {
    const s = this.state;
    const plan = this.schedPlan();
    const top = plan.pick(SCHED === 'b' ? 4 : 3);
    const cur = plan.cur;
    const next = top[0] || null;
    const curItems = cur.items;
    const span = Math.max(60, cur.E - cur.S);
    const ticks = curItems.map((x) => ({ cls: x.cls + (next && x.id === next.id ? ' nx' : ''), pos: Math.max(0, Math.min(100, (100 * (x.S - cur.S)) / span)).toFixed(1) }));
    const openP = s.openP || {};
    const periods = plan.periods.map((p) => {
      const open = p.id in openP ? openP[p.id] : p.isNow;
      return {
        ...p,
        open,
        closed: !open,
        tileCls: p.isNow ? 'accent' : '',
        sumLine: p.isNow ? 'עכשיו · ' + p.endsLine : p.isPast ? 'עבר · ' + (p.count === 1 ? 'זמן אחד' : p.count + ' זמנים') : p.brief,
        toggle: () => this.setState({ openP: { ...openP, [p.id]: !open } }),
        aria: p.name + ', ' + p.range + (open ? ', פתוח' : ', סגור'),
      };
    });
    const out = {
      schedA: SCHED === 'a',
      schedB: SCHED === 'b',
      schedC: SCHED === 'c',
      schedD: SCHED === 'd',
      schedCard: SCHED === 'a' || SCHED === 'b' || SCHED === 'c',
      openFirstCls: SCHED === 'a' || SCHED === 'b' || SCHED === 'c' ? '' : 'first',
      sCur: { ...cur, tileCls: 'accent' },
      sTitle: 'לוח הזמנים שלך',
      sBadges: plan.badges,
      sHasBadges: plan.badges.length > 0,
      sTop: top,
      sHasTop: top.length > 0,
      sNoTop: top.length === 0,
      sAll: plan.items,
      sOpen: Boolean(s.sAll),
      sClosed: !s.sAll,
      sMoreLabel: s.sAll ? 'פחות' : 'כל זמני היום (' + plan.items.length + ')',
      sToggle: () => this.setState({ sAll: !s.sAll }),
      sNext: next || {},
      sHasNext: Boolean(next),
      sThen: top.slice(1),
      sHasThen: top.length > 1,
      sTicks: ticks,
      sNowPct: String(cur.pct),
      sTrackAria: cur.name + ', ' + cur.range + ', עברו ' + cur.pct + ' אחוז',
      sPeriods: periods,
    };
    if (SCHED === 'd') {
      const byZ = Object.fromEntries(zchips.map((c) => [c.id, c]));
      if (s.allChips) {
        out.zchips = [...zchips, { id: 'less', label: 'פחות', time: '−', cls: '', tcls: 'b', pressed: false, ink: kit.inkPlain, aria: 'רק הזמנים החשובים', style: kit.plainBg, pick: () => this.setState({ allChips: false }) }];
      } else {
        const chips = top.slice(0, 4).map((x, i) => {
          const base = x.zid && byZ[x.zid];
          return {
            id: x.id,
            label: (i === 0 ? 'הבא · ' : '') + (x.season ? x.title.replace(/ · .*/, '') : base ? base.label.replace(/^הבא · /, '') : x.title),
            time: x.time,
            cls: i === 0 ? 'mk' : '',
            tcls: 'b',
            pressed: false,
            ink: x.season || i === 0 ? kit.inkNext : kit.inkPlain,
            aria: x.aria,
            style: x.season || i === 0 ? kit.nextBg : kit.plainBg,
            pick: () => this.scrub(x.S),
          };
        });
        const badges = plan.badges.map((b) => ({ id: 'b' + b.text, label: b.text.split(' · ')[0], time: b.text.split(' · ').slice(1).join(' · '), cls: '', tcls: '', pressed: false, ink: kit.inkNext, aria: b.text, style: kit.nextBg, pick: () => this.showToast({ text: b.text }) }));
        const more = zchips.length - chips.filter((x) => x.id in byZ).length;
        out.zchips = [...chips, ...badges, { id: 'all', label: 'כל הזמנים', time: '+' + more, cls: '', tcls: 'b', pressed: false, ink: kit.inkPlain, aria: 'כל ' + zchips.length + ' זמני היום', style: kit.plainBg, pick: () => this.setState({ allChips: true }) }];
      }
    }
    return out;
  }
