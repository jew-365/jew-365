  // Round 8 (2026-11-10): the owner picked round 7's period tone and asked that the filling move into the carousel,
  // onto the chip of the relevant time, with the progress of times running in parallel shown when they are touched;
  // the smart features of round 7's list ("לומד מהסימונים", "לוח השנה"); and more room for the mitzvah cards.
  // The card keeps היום, השבוע and שלי; עכשיו is the carousel's own live chip.

  // What the user's marks teach. In the app this reads the last weeks of marks; here the history is a demo
  // (Shacharit after the end of the Shema on 3 of the last 5 days, Mincha after plag on 4 of the last 7).
  r8Habits(plan) {
    const t = this.now();
    const z = this.day().z;
    const done = (id) => this.doneAt(id) != null;
    if (t < z.sofShma * 60 && t >= z.netz * 60 - 3600 && !done('shma')) return { k: '✦ למדנו: שחרית מאוחרת', text: 'לקרוא שמע קודם', chip: 'sofShma' };
    if (t >= z.chatzot * 60 && t < z.plag * 60 && !done('mincha')) return { k: '✦ למדנו: מנחה אחרי פלג', text: 'ב-4 מ-7 ימים', chip: 'plag' };
    return null;
  }

  r8Vals(zchips, kit, plan) {
    const s = this.state;
    const t = this.now();
    const z = this.day().z;
    const ui = s.ui || {};
    const setUi = (k, v) => () => this.setState({ ui: { ...(this.state.ui || {}), [k]: typeof v === 'function' ? v((this.state.ui || {})[k]) : v } });
    const base = this.r7Vals(zchips, kit, plan, { noNow: true, keepCandle: true, learn: true, mine: ['toShabbat', 'kl', 'pins'] });
    const cfg = { learn: true, ...(ui.r7cfg || {}) };
    const done = (id) => this.doneAt(id) != null;
    const mitz = this.items();
    const SHORT = { candle: 'הדלקת נרות', fastEnd: 'סוף הצום', sofShma: 'סוף ק״ש', sofTfila: 'סוף תפילה', shkia: 'שקיעה', chatzotL: 'חצות לילה', alot: 'עלות השחר' };

    // Every time that closes a window open now: its chip can show how much of the window has passed.
    const prog = [];
    for (const x of plan.future) {
      const id = x.zid || x.id;
      if (prog.some((p) => p.id === id)) continue;
      const m = x.ends ? mitz.find((i) => i.id === x.ends) : null;
      if (m && m.S <= t && !done(x.ends)) prog.push({ id, S0: m.S, E: x.S, label: SHORT[id] || x.title, why: x.why });
      else if (x.id === 'candle') prog.push({ id, S0: z.plag * 60, E: x.S, label: SHORT.candle, why: 'מפלג המנחה עד ההדלקה' });
      else if (x.id === 'fastEnd') prog.push({ id, S0: z.alot * 60, E: x.S, label: SHORT.fastEnd, why: 'מעלות השחר עד צאת הצום' });
    }
    const ranked = plan.future.slice().sort((a, b) => b.score - a.score || a.S - b.S);
    const leadItem = ranked.find((x) => prog.some((p) => p.id === (x.zid || x.id)));
    const leadId = leadItem ? leadItem.zid || leadItem.id : prog[0] ? prog[0].id : null;
    const focusId = ui.r8focus && prog.some((p) => p.id === ui.r8focus) ? ui.r8focus : leadId;
    const learn = cfg.learn ? this.r8Habits(plan) : null;
    const chips = base.zchips.map((c) => {
      const p = prog.find((x) => x.id === c.id && !/k-past|k-sep|k-tom/.test(c.cls));
      let cls = c.cls.replace(/\bmk\b/, '').trim() + (learn && learn.chip === c.id ? ' k-learn' : '');
      if (!p) return { ...c, cls };
      const q = Math.max(0.03, Math.min(1, (t - p.S0) / Math.max(60, p.E - p.S0)));
      const on = p.id === focusId;
      cls += ' k-prog' + (on ? ' k-live mk' : '');
      return {
        ...c,
        cls,
        label: on ? p.label + ' · ' + this.hm(p.E - t) : c.label,
        style: (c.style || '').replace(/;?\s*$/, '') + '; --q: ' + q.toFixed(3) + '; --p: ' + (q * 100).toFixed(1) + '%',
        aria: p.label + ' ' + c.time + ', נשארו ' + this.leftText(p.E - t) + ', עברו ' + Math.round(q * 100) + ' אחוז מהזמן' + (on ? '' : '. לחיצה מציגה את ההתקדמות'),
        pick: setUi('r8focus', on && p.id !== leadId ? null : p.id),
      };
    });
    if (!chips.some((c) => /\bmk\b/.test(c.cls))) {
      const i = chips.findIndex((c) => /k6/.test(c.cls) && !/k-past|k-sep/.test(c.cls));
      if (i >= 0) chips[i] = { ...chips[i], cls: chips[i].cls + ' mk' };
    }

    const r7 = base.r7;
    const cur = r7.cur;
    const curLine = cur.facts ? cur.facts.map((f) => f.v).join(' · ') : '';
    const A0 = this.dayStart();
    const dayPct = Math.max(0, Math.min(100, (100 * (t - A0)) / (this.dayEnd() - A0)));
    return {
      ...base,
      zchips: chips,
      heroCls: 'r6 r7 r8 r8' + SCHED + ' tn-' + r7.tone,
      r7CfgPages: base.r7CfgPages.filter((p) => p.id !== 'now'),
      r8: {
        curLine,
        nParallel: prog.length,
        parallelNote: prog.length > 1 ? prog.length + ' זמנים רצים עכשיו · נגיעה בצ׳יפ מראה את ההתקדמות שלו' : '',
        hasParallel: prog.length > 1,
        dayStyle: 'width: ' + dayPct.toFixed(1) + '%',
        period: plan.cur.name,
      },
      r8LearnOn: cfg.learn,
      r8CfgLearn: () => this.setState({ ui: { ...(this.state.ui || {}), r7cfg: { ...(ui.r7cfg || {}), learn: !cfg.learn } } }),
      r8On: { card: 'GIJK'.includes(SCHED), any: true, clock: SCHED === 'J' },
    };
  }
