  // Round 7 (2026-11-10): the owner's pick of round 6, the smart stack, with more in the same card and the live
  // chip of R6Live inside it. "יותר אינפורמציה ... באותו גודל ... בשבוע ... זמני כניסה ויציאה של השבת ... ביום ...
  // ערך מוסף ... לשלב את הצ׳יפ החי שמתמלא ... חכם, אופציונלי, מחובר לזמן ולתקופה ... גמישות".
  // Four pages: עכשיו (the live countdown, relative only: the carousel prints the clock time and marks it), היום
  // (what the day is and what the prayer adds), השבוע (the parasha, Shabbat's entry and exit, what the week brings)
  // and שלי (facts the user picks). Shabbat's times live in השבוע alone, so the carousel drops its candle and exit chips.
  r7Vals(zchips, kit, plan) {
    const r6 = this.r6Vals(zchips, kit, plan);
    const s = this.state;
    const t = this.now();
    const D = this.data();
    const key = this.dayKey();
    const day = this.day();
    const z = day.z;
    const clock = (sec) => this.clock(sec);
    const ui = s.ui || {};
    const setUi = (k, v) => () => this.setState({ ui: { ...(this.state.ui || {}), [k]: typeof v === 'function' ? v((this.state.ui || {})[k]) : v } });
    const cfg = { smart: true, rotate: true, pages: { now: true, day: true, week: true, mine: true }, mine: ['toShabbat', 'kl', 'hilula'], ...(ui.r7cfg || {}) };
    const setCfg = (patch) => () => this.setState({ ui: { ...(this.state.ui || {}), r7cfg: { ...cfg, ...(typeof patch === 'function' ? patch(cfg) : patch) } } });
    const wdName = (k) => (D.days[k] ? D.days[k].weekday.replace('יום ', '') : '');
    const WD = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    const evOn = (k) => D.events.filter((e) => e.d === k);

    // עכשיו: the most relevant time ahead, counted down, never its clock time.
    const SHORT = { candle: 'הדלקת נרות', chanukah: 'נרות חנוכה', fastEnd: 'סוף הצום', exit: 'צאת השבת', kl: 'קידוש לבנה', sofShma: 'סוף זמן ק״ש', sofTfila: 'סוף זמן תפילה', shkia: 'שקיעה', tzeit: 'צאת הכוכבים', chatzotL: 'חצות הלילה', alot: 'עלות השחר' };
    const ranked = plan.future.slice().sort((a, b) => b.score - a.score || a.S - b.S);
    const lead = ranked.find((x) => x.S <= plan.horizonEnd || x.season) || plan.future[0] || null;
    const after = lead ? plan.future.filter((x) => x !== lead && x.S > lead.S)[0] : null;
    const prevS = Math.max(this.dayStart(), ...plan.items.filter((x) => x.S <= t).map((x) => x.S));
    const pct = lead ? Math.max(0.03, Math.min(1, 1 - (lead.S - t) / Math.max(1800, lead.S - prevS))) : 0;
    const mins = lead ? (lead.S - t) / 60 : 0;
    const heat = !lead ? 'calm' : mins <= 45 ? 'hot' : mins <= 150 ? 'warm' : 'calm';
    const live = lead
      ? {
          label: SHORT[lead.id] || lead.title.replace(/ · .*/, ''),
          big: this.hm(lead.S - t),
          left: 'בעוד ' + this.leftText(lead.S - t),
          why: (lead.why || '').replace(/ · עד \d\d:\d\d/, ''),
          hasWhy: Boolean(lead.why),
          after: after ? 'אחריו ' + (SHORT[after.id] || after.title.replace(/ · .*/, '')) + ', בעוד ' + this.leftText(after.S - t) : '',
          hasAfter: Boolean(after),
          pct: Math.round(pct * 100),
          barStyle: 'width: ' + (pct * 100).toFixed(1) + '%',
          ringOff: (188.5 * (1 - pct)).toFixed(1),
          heat,
          aria: (SHORT[lead.id] || lead.title) + ' בעוד ' + this.leftText(lead.S - t) + (lead.why ? ', ' + lead.why : ''),
        }
      : { label: 'אין עוד זמנים היום', big: '', left: '', why: '', hasWhy: false, after: '', hasAfter: false, pct: 0, barStyle: 'width: 0%', ringOff: '188.5', heat: 'calm', aria: 'אין עוד זמנים היום' };

    // היום: what the day is, what the prayer adds.
    const ev = evOn(key);
    const rc = ev.find((e) => e.rc);
    const chan = ev.find((e) => e.chanukah);
    const fast = ev.find((e) => e.fast);
    const erev = D.blocks.find((b) => b.erev === key);
    const motzash = D.blocks.find((b) => b.end === key);
    const hil = [...(day.hilulaToday || []), ...(day.hilulaTonight || [])];
    const klBadge = plan.badges.find((x) => /^קידוש לבנה/.test(x.text));
    const klOpen = klBadge && /פתוח/.test(klBadge.text) ? { until: klBadge.text.split(' · ').slice(1).join(' · ') } : null;
    const special = rc ? { text: rc.title, icon: 'moon' } : chan ? { text: chan.title.replace(/^חנוכה: /, 'חנוכה · ') + ' הערב', icon: 'candle' } : fast ? { text: fast.title + ' · צום', icon: 'star' } : erev ? { text: 'ערב ' + erev.title.replace('שבת פרשת ', 'שבת '), icon: 'candle' } : motzash ? { text: 'מוצאי ' + motzash.title.replace('שבת פרשת ', 'שבת '), icon: 'star' } : hil.length ? { text: 'הילולת ' + hil.join(' ו'), icon: 'flame' } : null;
    const wd = D.days[key].wd;
    const prayer = rc ? 'יעלה ויבוא · חצי הלל · מוסף' : chan ? 'על הניסים · הלל שלם' : fast ? 'עננו · אבינו מלכנו' : (wd === 1 || wd === 4) ? 'קריאת התורה · והוא רחום' : 'ותן טל ומטר';
    const TEH = [['א', 'כט'], ['ל', 'נ'], ['נא', 'עב'], ['עג', 'פט'], ['צ', 'קו'], ['קז', 'קיט'], ['קכ', 'קנ']];
    const dayFacts = [
      { k: 'בתפילה', v: prayer },
      klOpen ? { k: 'קידוש לבנה', v: 'פתוח · ' + klOpen.until } : hil.length && special && special.icon !== 'flame' ? { k: 'הילולא', v: hil.join(' ו') } : { k: 'תהילים היום', v: TEH[wd][0] + '–' + TEH[wd][1] },
    ];
    const dayPage = { id: 'day', name: 'היום', title: special ? special.text : 'יום ' + wdName(key) + ' רגיל', icon: special ? special.icon : 'cal', facts: dayFacts };

    // השבוע: the parasha, Shabbat's entry and exit, what the week brings.
    let shab = null;
    for (let i = 0; i < 8 && !shab; i++) {
      const b = D.blocks.find((x) => x.erev === this.shiftDate(key, i));
      if (b) shab = { ...b, inDays: i };
    }
    const weekFacts = [];
    if (shab) weekFacts.push({ k: 'כניסה', v: (shab.inDays === 0 ? 'היום ' : WD[D.days[shab.erev].wd] + ' ') + clock(shab.candle * 60) }, { k: 'יציאה', v: WD[D.days[shab.end].wd] + ' ' + clock(shab.exit * 60) });
    let soon = null;
    for (let i = 1; i <= 7 && !soon; i++) {
      const k = this.shiftDate(key, i);
      const e = evOn(k);
      const r = e.find((x) => x.rc);
      const c = e.find((x) => x.chanukah && /א׳ נר/.test(x.title));
      const f = e.find((x) => x.fast);
      const pick = r || c || f;
      if (pick) soon = { k: r ? 'ראש חודש' : c ? 'חנוכה' : 'צום', v: (r ? r.title.replace('ראש חודש ', '') + ' · ' : f ? f.title + ' · ' : 'נר ראשון · ') + 'יום ' + wdName(k) };
    }
    const nextRc = D.events.find((e) => e.rc && e.d > (shab ? shab.end : key) && this.daysBetween(shab ? shab.end : key, e.d) <= 7);
    if (shab && nextRc) {
      const month = nextRc.title.replace('ראש חודש ', '');
      const mol = (D.molad || []).find((m) => m.he.includes(' ' + month + ' '));
      const mm = mol && mol.he.match(/ביום (\S+) בשבוע, בשעה (\d+)[^,]*, ו-(\d+) דקות ו-(\d+) חלקים/);
      weekFacts.push({ k: 'שבת מברכים', v: 'מולד ' + month + (mm ? ' · ' + mm[1] + ' ' + String(mm[2]).padStart(2, '0') + ':' + String(mm[3]).padStart(2, '0') + ' ו-' + mm[4] + ' חל׳' : '') });
    }
    if (soon) weekFacts.push(soon);
    const weekPage = { id: 'week', name: 'השבוע', title: shab ? shab.title.replace(/^שבת /, '') : day.parasha, icon: 'cal', facts: weekFacts.slice(0, 3) };

    // שלי: facts the user picks, none of them a clock time the carousel prints.
    const toShabS = shab ? (shab.candle + shab.inDays * 1440) * 60 - t : null;
    const days2 = toShabS != null ? Math.floor(toShabS / 86400) : 0;
    const CAT = [
      { id: 'tehillim', k: 'תהילים היום', v: 'פרקים ' + TEH[wd][0] + '–' + TEH[wd][1], why: 'החלוקה השבועית, לפי היום' },
      { id: 'toShabbat', k: 'עד השבת', v: toShabS == null ? '' : toShabS <= 0 ? 'שבת נכנסה' : (days2 ? days2 + (days2 === 1 ? ' יום' : ' ימים') + ' ו-' : '') + this.leftText(toShabS % 86400 || 60), why: 'ספירה לאחור להדלקה' },
      { id: 'kl', k: 'קידוש לבנה', v: klBadge ? klBadge.text.replace(/^קידוש לבנה /, '') : '', why: 'כשהחלון פתוח או נפתח בקרוב' },
      { id: 'hilula', k: 'הילולא קרובה', v: (() => { for (let i = 0; i < 14; i++) { const d = D.days[this.shiftDate(key, i)]; if (d && (d.hilulaToday.length || d.hilulaTonight.length)) return (d.hilulaToday[0] || d.hilulaTonight[0]) + (i ? ' · יום ' + wdName(this.shiftDate(key, i)) : ' · היום'); } return ''; })(), why: 'מרשימת ההילולות' },
      { id: 'pins', k: 'זמנים שבחרת', v: (s.pins || ['misheyakir']).map((id) => (this.boardCatalog().find((c) => c.id === id) || {}).label).filter(Boolean).join(' · '), why: 'מסומנים בכוכב בקרוסלה' },
    ];
    const mineFacts = cfg.mine.map((id) => CAT.find((c) => c.id === id)).filter((c) => c && c.v && !(c.id === 'kl' && klOpen) && !(c.id === 'tehillim' && cfg.pages.day !== false && !klOpen)).slice(0, 3);
    const minePage = { id: 'mine', name: 'שלי', title: mineFacts.length ? 'מה שבחרת' : 'עוד לא בחרת', icon: 'star', facts: mineFacts.length ? mineFacts : [{ k: 'בוחרים', v: 'ב⋯ שבפינה' }] };

    // Smart mode picks the page by the moment; a page the user chose stays until the next minute of the clock.
    const nowPage = { id: 'now', name: 'עכשיו', title: live.label, icon: 'clock', facts: [] };
    const all = [nowPage, dayPage, weekPage, minePage].filter((p) => cfg.pages[p.id]);
    const pages = all.length ? all : [nowPage];
    const thuNight = wd === 4 && t >= z.tzeit * 60;
    const smartId = lead && mins <= 60 ? 'now' : special ? 'day' : thuNight || wd === 5 ? 'week' : 'now';
    const tick = Math.floor(this.state.e / 6);
    const rotating = cfg.rotate && !ui.r7page;
    const startId = cfg.smart ? smartId : pages[0].id;
    const si = Math.max(0, pages.findIndex((p) => p.id === startId));
    const pi = ui.r7page ? Math.max(0, pages.findIndex((p) => p.id === ui.r7page)) : rotating ? (si + tick) % pages.length : si;
    const ICON = (icon) => ({ isCandle: icon === 'candle', isStar: icon === 'star', isMoon: icon === 'moon', isCal: icon === 'cal' || icon === 'flame' || icon === 'clock' });
    const out = pages.map((p, i) => ({
      ...p,
      ...ICON(p.icon),
      isNow: p.id === 'now',
      notNow: p.id !== 'now',
      on: i === pi,
      cls: (i === pi ? 'on' : '') + (p.id === smartId && cfg.smart ? ' smart' : ''),
      facts: p.facts.map((f, j) => ({ ...f, cls: 'f' + j })),
      hasFacts: p.facts.length > 0,
      pick: setUi('r7page', p.id),
      aria: p.name + (p.id === 'now' ? ': ' + live.aria : ': ' + p.title + (p.facts.length ? ', ' + p.facts.map((f) => f.k + ' ' + f.v).join(', ') : '')),
    }));
    const cur = out[pi];
    const sidePages = out.filter((p) => !p.isNow);
    const side = cur.isNow ? sidePages[(tick) % Math.max(1, sidePages.length)] || cur : cur;
    const line = (p) => (p ? p.title.replace(/^פרשת /, '') + (p.facts.length ? ' · ' + p.facts.map((f) => (p.id === 'week' ? f.k + ' ' + f.v : f.v)).slice(0, p.id === 'week' ? 2 : 1).join(' · ') : '') : '');

    // The period's tone, for the boards that colour the card by it.
    const tone = erev ? 'shabbat' : chan ? 'chanukah' : fast ? 'fast' : rc ? 'rc' : motzash ? 'night' : { dawn: 'dawn', morning: 'morning', noon: 'noon', evening: 'evening', night: 'night' }[plan.cur.id] || 'morning';

    // The carousel: Shabbat's times leave it for השבוע; the live time is marked.
    const leadKey = lead ? lead.zid || lead.id : null;
    let chips = r6.zchips.filter((c) => c.id !== 'candle' && c.id !== 'exit').map((c) => ({ ...c, cls: c.cls.replace(/\bmk\b/, '').trim() }));
    const mk = chips.find((c) => c.id === leadKey) || chips.find((c) => /k6/.test(c.cls) && !/k-past|k-sep/.test(c.cls));
    if (mk) chips = chips.map((c) => (c === mk ? { ...c, cls: c.cls + ' mk' } : c));

    const catRows = CAT.map((c) => ({ ...c, on: cfg.mine.includes(c.id), act: cfg.mine.includes(c.id) ? 'מוצג' : 'הוספה', has: Boolean(c.v), toggle: setCfg((x) => ({ mine: x.mine.includes(c.id) ? x.mine.filter((m) => m !== c.id) : [...x.mine, c.id].slice(-3) })) }));
    const pageRows = [nowPage, dayPage, weekPage, minePage].map((p) => ({ id: p.id, name: p.name, on: cfg.pages[p.id] !== false, toggle: setCfg((x) => ({ pages: { ...x.pages, [p.id]: !(x.pages[p.id] !== false) } })) }));
    return {
      ...r6,
      zchips: chips,
      r6: r6.r6,
      r7: { pages: out, cur, live, tone, toneCls: 'tone-' + tone, heatCls: 'heat-' + live.heat, many: out.length > 1, next: setUi('r7page', out[(pi + 1) % out.length].id), smartOn: cfg.smart, rotateOn: cfg.rotate, smartName: (out.find((p) => p.id === smartId) || {}).name || '', auto: setUi('r7page', null), pinned: Boolean(ui.r7page), dayPage: out.find((p) => p.id === 'day') || { facts: [] }, weekPage: out.find((p) => p.id === 'week') || { facts: [] }, minePage: out.find((p) => p.id === 'mine') || { facts: [] }, side: { ...side, sel: true }, sidePages: sidePages.map((p) => ({ ...p, on: p.id === side.id })), dayLine: line(out.find((p) => p.id === 'day')), weekLine: line(out.find((p) => p.id === 'week')), mineLine: line(out.find((p) => p.id === 'mine')), hasDay: out.some((p) => p.id === 'day'), hasWeek: out.some((p) => p.id === 'week'), hasMine: out.some((p) => p.id === 'mine'), pickDay: setUi('r7page', 'day'), pickWeek: setUi('r7page', 'week'), pickMine: setUi('r7page', 'mine'), pickNow: setUi('r7page', 'now') },
      r7NativeOn: SCHED === 'F' && !ui.r7nativeOff,
      r7NativeClose: setUi('r7nativeOff', true),
      r7NativeOpen: setUi('r7nativeOff', false),
      r7Cfg: Boolean(ui.r7cfgOpen),
      r7CfgOpen: setUi('r7cfgOpen', true),
      r7CfgClose: setUi('r7cfgOpen', false),
      r7CfgSmart: setCfg((x) => ({ smart: !x.smart })),
      r7CfgRotate: setCfg((x) => ({ rotate: !x.rotate })),
      r7CfgPages: pageRows,
      r7CfgCat: catRows,
      r7Native: ui.r7native || 'home',
      r7NativeTabs: [['home', 'מסך הבית'], ['lock', 'מסך נעילה'], ['android', 'אנדרואיד']].map(([id, name]) => ({ id, name, on: (ui.r7native || 'home') === id, pick: setUi('r7native', id) })),
      r7IsHome: (ui.r7native || 'home') === 'home',
      r7IsLock: ui.r7native === 'lock',
      r7IsAndroid: ui.r7native === 'android',
      heroCls: 'r6 r7 r7' + SCHED,
      midCaption: plan.cur.name,
    };
  }
