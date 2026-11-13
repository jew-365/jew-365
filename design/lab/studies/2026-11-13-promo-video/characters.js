// The promo video's characters: five traditional looks drawn in SVG, each with a weekday and a Shabbat outfit.
// Shared by stage.html (the video) and gallery.html (the page the owner picks from). Plain browser script:
// it defines window.CHARACTERS, characterSVG(), characterFace() and characterArm().
// Frame: the figure is centred on x = 0; the head spans y 520-950, the shoulders sit at y 990.
(function () {
  const CHARACTERS = {
    litvish: {
      name: 'האברך',
      about: 'כובע שחור, חליפה, זקן מלא ומשקפיים עגולים',
      skin: '#EEC6A2', shade: '#C9946E', hair: '#1D1814', beard: 'full', beardColor: '#221B16',
      peyot: 'tucked', head: 'fedora', glasses: 'round', coat: 'suit', jacket: '#1B1C22', shirt: '#FFFFFF',
      tzitzit: true, eye: '#3A2A1E',
      shabbat: { head: 'fedora' },
    },
    chassid: {
      name: 'החסיד',
      about: 'כובע עגול, פאות מסולסלות, זקן ארוך וקפוטה. בשבת שטריימל',
      skin: '#F1CBA8', shade: '#CB9670', hair: '#6A3B1E', beard: 'long', beardColor: '#73411F',
      peyot: 'curl', head: 'roundhat', glasses: null, coat: 'bekishe', jacket: '#111216', shirt: '#FFFFFF',
      tzitzit: false, eye: '#4A3424',
      shabbat: { head: 'shtreimel' },
    },
    sephardi: {
      name: 'הספרדי',
      about: 'כיפה שחורה, זקן מסודר, חליפה כחולה כהה',
      skin: '#C78F65', shade: '#9E6A44', hair: '#15110E', beard: 'trim', beardColor: '#17120F',
      peyot: 'none', head: 'small', glasses: null, coat: 'suit', jacket: '#1F2B47', shirt: '#FFFFFF',
      tzitzit: false, eye: '#2B1D14',
      shabbat: { head: 'small' },
    },
    bachur: {
      name: 'בחור הישיבה',
      about: 'כיפת קטיפה, חולצה לבנה, ציצית בחוץ ומשקפיים',
      skin: '#F2CEAD', shade: '#CF9C76', hair: '#251B15', beard: 'stubble', beardColor: '#2A1F18',
      peyot: 'tucked', head: 'velvet', glasses: 'rect', coat: null, jacket: null, shirt: '#FFFFFF',
      tzitzit: true, eye: '#3A2A1E',
      shabbat: { head: 'velvet', coat: 'suit', jacket: '#16171C' },
    },
    dati: {
      name: 'הדתי־לאומי',
      about: 'כיפה סרוגה גדולה, ציצית בחוץ, זקן קצר',
      skin: '#E9B58B', shade: '#C38B62', hair: '#3A2618', beard: 'trim', beardColor: '#3A2618',
      peyot: 'none', head: 'knit', glasses: null, coat: null, jacket: null, shirt: '#8FB4DF',
      tzitzit: true, eye: '#3A2A1E',
      shabbat: { head: 'knitWhite', shirt: '#FFFFFF' },
    },
  };

  const darken = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  const lighten = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  const mirror = (d) => `<g transform="scale(-1 1)">${d}</g>`;
  const both = (d) => d + mirror(d);

  function outfit(c, shabbat) {
    return shabbat ? { ...c, ...c.shabbat } : c;
  }

  function body(c, p) {
    const shirtLine = darken(c.shirt, 0.12);
    let s = `
      <rect x="-46" y="860" width="92" height="140" rx="30" fill="${c.shade}"/>
      <path d="M-240,1080 C-236,1012 -180,986 -92,976 L92,976 C180,986 236,1012 240,1080 L262,1560 L-262,1560 Z" fill="${c.shirt}"/>
      ${both(`<path d="M-66,966 L-6,1034 L-28,1056 L-84,992 Z" fill="${c.shirt}" stroke="${shirtLine}" stroke-width="4" stroke-linejoin="round"/>`)}
      <path d="M-40,962 L0,1018 L40,962 L0,990 Z" fill="${c.shade}"/>
      <line x1="0" y1="1040" x2="0" y2="1560" stroke="${shirtLine}" stroke-width="4"/>
      <circle cx="0" cy="1100" r="6" fill="${shirtLine}"/><circle cx="0" cy="1190" r="6" fill="${shirtLine}"/><circle cx="0" cy="1280" r="6" fill="${shirtLine}"/>`;
    if (c.coat === 'suit') {
      const j = c.jacket, jl = lighten(j, 0.12), jd = darken(j, 0.3);
      s += both(`
        <path d="M-240,1080 C-236,1012 -180,986 -96,974 L-52,972 L-14,1210 L-36,1560 L-262,1560 Z" fill="${j}"/>
        <path d="M-96,974 L-52,972 L-12,1200 L-58,1110 L-92,1060 L-126,1000 Z" fill="${jl}"/>
        <path d="M-52,972 L-14,1210" stroke="${jd}" stroke-width="5"/>
        <path d="M-200,1240 L-120,1236" stroke="${jd}" stroke-width="5" stroke-linecap="round"/>`);
      s += `<circle cx="-24" cy="1270" r="8" fill="${jd}"/><circle cx="-26" cy="1360" r="8" fill="${jd}"/>`;
    } else if (c.coat === 'bekishe') {
      const j = c.jacket;
      s += `
        <path d="M-240,1080 C-236,1012 -180,986 -96,974 L-40,970 L-8,1150 L-12,1560 L-262,1560 Z" fill="${j}"/>
        <path d="M240,1080 C236,1012 180,986 96,974 L40,970 L14,1150 L22,1560 L262,1560 Z" fill="${lighten(j, 0.06)}"/>
        <path d="M-40,970 L-8,1150 L-12,1560" fill="none" stroke="#000" stroke-width="5" opacity=".5"/>
        <path d="M-180,1040 C-150,1200 -150,1380 -170,1560" fill="none" stroke="#FFFFFF" stroke-width="22" opacity=".07"/>
        <path d="M150,1040 C120,1200 120,1380 140,1560" fill="none" stroke="#FFFFFF" stroke-width="16" opacity=".06"/>`;
    }
    if (c.tzitzit && !c.coat) {
      const strings = (x) => [0, 1, 2, 3].map((i) =>
        `<path d="M${x + i * 7},${1240 + (i % 2) * 6} C${x + i * 7 - 6},${1300} ${x + i * 7 + 6},${1340} ${x + i * 7 - 2},${1420}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
         <path d="M${x + i * 7},${1240 + (i % 2) * 6} C${x + i * 7 - 6},${1300} ${x + i * 7 + 6},${1340} ${x + i * 7 - 2},${1420}" fill="none" stroke="#C9C3B5" stroke-width="1.5" opacity=".7"/>`).join('');
      const x = 200;
      s += `<g>${strings(-x - 12)}${strings(x - 12)}</g>`;
    }
    return s;
  }

  function beard(c, part) {
    const b = c.beardColor, hl = lighten(b, 0.18);
    const mustache = c.beard === 'stubble' ? '' : `<path d="M-60,868 C-48,846 -14,842 0,850 C14,842 48,846 60,868 C52,878 34,880 18,872 C10,868 -10,868 -18,872 C-34,880 -52,878 -60,868 Z" fill="${b}"/>
      <path d="M-40,858 C-26,852 -10,852 -2,856 M2,856 C10,852 26,852 40,858" stroke="${hl}" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>`;
    if (part === 'mustache') return c.beard === 'none' ? '' : mustache;
    const strands = (pts) => pts.map(([x1, y1, x2, y2]) => `<path d="M${x1},${y1} Q${(x1 + x2) / 2 + 6},${(y1 + y2) / 2} ${x2},${y2}" stroke="${hl}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>`).join('');
    if (c.beard === 'full')
      return `<path d="M-122,780 C-126,880 -104,970 -62,1030 C-34,1066 34,1066 62,1030 C104,970 126,880 122,780 C114,842 92,880 58,888 C32,876 -32,876 -58,888 C-92,880 -114,842 -122,780 Z" fill="${b}"/>
        ${strands([[-80, 920, -60, 1000], [-30, 930, -20, 1030], [20, 930, 24, 1030], [70, 920, 54, 1000], [-100, 860, -86, 930], [100, 860, 88, 930]])}`;
    if (c.beard === 'long')
      return `<path d="M-122,780 C-130,900 -110,1020 -70,1100 C-40,1150 -10,1176 0,1180 C10,1176 40,1150 70,1100 C110,1020 130,900 122,780 C114,842 92,880 58,888 C32,876 -32,876 -58,888 C-92,880 -114,842 -122,780 Z" fill="${b}"/>
        ${strands([[-86, 920, -60, 1060], [-40, 930, -24, 1120], [0, 940, 0, 1150], [40, 930, 26, 1120], [86, 920, 62, 1060], [-104, 860, -92, 960], [104, 860, 92, 960]])}`;
    if (c.beard === 'trim')
      return `<path d="M-122,790 C-122,880 -74,944 0,952 C74,944 122,880 122,790 C112,846 86,878 54,882 C30,870 -30,870 -54,882 C-86,878 -112,846 -122,790 Z" fill="${b}"/>
        ${strands([[-70, 900, -54, 930], [-20, 910, -14, 944], [24, 910, 18, 944], [72, 900, 56, 930]])}`;
    if (c.beard === 'stubble')
      return `<path d="M-120,800 C-118,884 -72,944 0,950 C72,944 118,884 120,800 C110,850 84,880 52,884 C30,872 -30,872 -52,884 C-84,880 -110,850 -120,800 Z" fill="${b}" opacity=".1"/>`;
    return '';
  }

  function hairAndHead(c, prefix) {
    const hair = c.hair;
    const sides = both(`<path d="M-124,770 C-132,700 -122,650 -96,636 L-98,700 C-106,724 -114,746 -124,770 Z" fill="${hair}"/>`);
    const fullHair = `<path d="M-126,770 C-140,640 -84,584 0,584 C84,584 140,640 126,770 C118,704 96,676 58,668 C20,680 -20,680 -58,668 C-96,676 -118,704 -126,770 Z" fill="${hair}"/>`;
    let peyot = '';
    if (c.peyot === 'curl')
      peyot = both(`<path d="M-112,742 C-134,780 -98,800 -118,832 C-138,864 -100,884 -120,914 C-136,940 -112,958 -114,972" fill="none" stroke="${hair}" stroke-width="14" stroke-linecap="round"/>
        <path d="M-112,742 C-134,780 -98,800 -118,832 C-138,864 -100,884 -120,914" fill="none" stroke="${lighten(hair, 0.25)}" stroke-width="4" stroke-linecap="round" opacity=".6"/>`);
    else if (c.peyot === 'tucked')
      peyot = both(`<path d="M-118,744 C-128,770 -140,790 -146,822" fill="none" stroke="${hair}" stroke-width="10" stroke-linecap="round"/>`);

    let head = '';
    const hatShadow = `<ellipse cx="0" cy="676" rx="116" ry="20" fill="#000" opacity=".16"/>`;
    switch (c.head) {
      case 'fedora':
        head = `${sides}${hatShadow}
          <path d="M-114,646 C-118,566 -104,520 -62,510 C-34,522 34,522 62,510 C104,520 118,566 114,646 Z" fill="#15161C"/>
          <path d="M-62,510 C-34,522 34,522 62,510 C40,540 -40,540 -62,510 Z" fill="#0B0C10"/>
          <path d="M-114,612 C-60,622 60,622 114,612 L114,646 C60,652 -60,652 -114,646 Z" fill="#2B2D36"/>
          <path d="M-194,656 C-150,628 150,628 194,656 C186,676 124,682 0,678 C-124,682 -186,676 -194,656 Z" fill="#15161C"/>
          <path d="M-188,654 C-140,632 140,632 188,654" fill="none" stroke="#3C3F4C" stroke-width="5"/>
          <path d="M-96,560 C-92,540 -80,528 -66,522" fill="none" stroke="#3C3F4C" stroke-width="6" stroke-linecap="round"/>`;
        break;
      case 'roundhat':
        head = `${sides}${hatShadow}
          <path d="M-108,652 C-114,584 -72,540 0,540 C72,540 114,584 108,652 Z" fill="#141519"/>
          <path d="M-108,620 C-56,628 56,628 108,620 L108,652 C56,658 -56,658 -108,652 Z" fill="#26272E"/>
          <path d="M-206,660 C-160,640 160,640 206,660 C200,680 132,686 0,684 C-132,686 -200,680 -206,660 Z" fill="#141519"/>
          <path d="M-198,658 C-150,640 150,640 198,658" fill="none" stroke="#373945" stroke-width="5"/>
          <path d="M-80,572 C-66,556 -44,548 -24,546" fill="none" stroke="#373945" stroke-width="6" stroke-linecap="round"/>`;
        break;
      case 'shtreimel': {
        const tones = ['#8A5A2E', '#6B4423', '#A36D3B', '#5A381C'];
        const fur = [612, 632, 652].map((y, r) => Array.from({ length: 26 }, (_, i) => {
          const x = -160 + i * 12.8 + (r % 2) * 6;
          const lift = Math.cos((x / 170) * Math.PI / 2) * 22;
          return `<path d="M${x},${y - lift + 18} q${-6 + (i % 3) * 4},-16 ${2 + (i % 2) * 3},-30" fill="none" stroke="${tones[(i + r) % 4]}" stroke-width="10" stroke-linecap="round"/>`;
        }).join('')).join('');
        head = `${sides}${hatShadow}
          <path d="M-174,662 C-184,604 -128,560 0,560 C128,560 184,604 174,662 C150,686 -150,686 -174,662 Z" fill="#6E4524"/>
          ${fur}
          <path d="M-104,572 C-56,552 56,552 104,572 C56,586 -56,586 -104,572 Z" fill="#101114"/>
          <path d="M-174,662 C-150,686 150,686 174,662" fill="none" stroke="#4A2C15" stroke-width="8" stroke-linecap="round"/>`;
        break;
      }
      case 'velvet':
        head = `${fullHair}
          <path d="M-100,630 C-86,578 -44,560 0,560 C44,560 86,578 100,630 C60,616 -60,616 -100,630 Z" fill="#121318"/>
          <path d="M-60,586 C-40,572 -14,568 8,570" fill="none" stroke="#454857" stroke-width="7" stroke-linecap="round"/>`;
        break;
      case 'knit':
      case 'knitWhite': {
        const base = c.head === 'knit' ? '#1D2240' : '#FBFAF4', ring = c.head === 'knit' ? '#F08A3C' : '#2F5FA8', dots = c.head === 'knit' ? '#FFFFFF' : '#2F5FA8';
        head = `${fullHair}
          <path d="M-96,622 C-80,578 -42,562 0,562 C42,562 80,578 96,622 C60,612 -60,612 -96,622 Z" fill="${base}" stroke="${darken(base, 0.15)}" stroke-width="3"/>
          <path d="M-80,606 C-50,590 50,590 80,606" fill="none" stroke="${ring}" stroke-width="8" stroke-dasharray="12 7"/>
          <path d="M-52,584 C-30,576 30,576 52,584" fill="none" stroke="${dots}" stroke-width="5" stroke-dasharray="4 8" stroke-linecap="round"/>`;
        break;
      }
      case 'small':
        head = `${fullHair}
          <path d="M-84,612 C-70,586 -36,576 4,576 C44,576 76,588 88,612 C44,602 -40,602 -84,612 Z" fill="#14151B" stroke="#5B606E" stroke-width="4"/>
          <path d="M-78,606 C-40,597 44,597 82,606" fill="none" stroke="#C9A75E" stroke-width="5" stroke-dasharray="9 6"/>
          <path d="M-48,590 C-30,584 -10,582 8,583" fill="none" stroke="#43464F" stroke-width="5" stroke-linecap="round"/>`;
        break;
      default:
        head = fullHair;
    }
    return { head, peyot };
  }

  function glasses(kind) {
    if (!kind) return '';
    const lens = kind === 'round'
      ? both(`<circle cx="-44" cy="778" r="31" fill="#FFFFFF" fill-opacity=".1" stroke="#1A1A1E" stroke-width="6"/>`)
      : both(`<rect x="-80" y="756" width="70" height="46" rx="12" fill="#FFFFFF" fill-opacity=".1" stroke="#1A1A1E" stroke-width="6"/>`);
    const reach = kind === 'round' ? 75 : 80;
    return `${lens}<path d="M-13,774 Q0,766 13,774" fill="none" stroke="#1A1A1E" stroke-width="5"/>
      ${both(`<path d="M-${reach},772 L-120,766" stroke="#1A1A1E" stroke-width="5"/>`)}`;
  }

  // The whole figure. state: { shabbat }. Ids under prefix: Head, EyeL, EyeR, IrisL, IrisR, Brows, Mouth, Glow, ArmR, ArmL.
  function characterSVG(key, prefix, { shabbat = false } = {}) {
    const c = outfit(CHARACTERS[key], shabbat);
    const { head, peyot } = hairAndHead(c, prefix);
    const eye = (side, x) => `
      <g id="${prefix}Eye${side}">
        <ellipse cx="${x}" cy="778" rx="19" ry="12.5" fill="#FFFFFF"/>
        <g id="${prefix}Iris${side}"><circle cx="${x}" cy="778" r="9.5" fill="${c.eye}"/><circle cx="${x}" cy="778" r="4.6" fill="#0E0B09"/><circle cx="${x + 3.5}" cy="774.5" r="2.8" fill="#FFFFFF"/></g>
        <path d="M${x - 21},776 C${x - 12},762 ${x + 12},762 ${x + 21},776" fill="none" stroke="${darken(c.skin, 0.55)}" stroke-width="4.5" stroke-linecap="round"/>
      </g>`;
    return `
    <g id="${prefix}" data-character="${key}">
      ${body(c, prefix)}
      <g id="${prefix}Head">
        ${both(`<ellipse cx="-122" cy="798" rx="23" ry="35" fill="${c.skin}"/><ellipse cx="-124" cy="800" rx="10" ry="19" fill="${c.shade}" opacity=".7"/>`)}
        <path d="M-120,720 C-122,640 -74,602 0,602 C74,602 122,640 120,720 L118,810 C114,890 66,944 0,948 C-66,944 -114,890 -118,810 Z" fill="${c.skin}"/>
        <path d="M58,622 C108,644 124,704 120,764 L116,830 C110,892 70,936 22,946 C70,900 96,840 98,764 C100,704 88,654 58,622 Z" fill="${c.shade}" opacity=".32"/>
        ${both(`<ellipse cx="-66" cy="842" rx="22" ry="14" fill="#E2806D" opacity=".18"/>`)}
        <path d="M-2,782 C-6,808 -20,824 -12,836 C-4,842 10,842 18,834" fill="none" stroke="${c.shade}" stroke-width="5.5" stroke-linecap="round"/>
        ${eye('L', -44)}${eye('R', 44)}
        <g id="${prefix}Brows" fill="${c.hair}">
          ${both(`<path d="M-76,746 C-62,730 -36,726 -16,734 L-18,746 C-36,740 -58,742 -74,754 Z"/>`)}
        </g>
        ${beard(c)}
        <path id="${prefix}Mouth" d="M-30,872 Q0,890 30,872" fill="none" stroke="#7A3424" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        ${beard(c, 'mustache')}
        ${head}${peyot}
        ${glasses(c.glasses)}
        <ellipse id="${prefix}Glow" cx="0" cy="840" rx="150" ry="130" fill="#FFF3DA" opacity="0"/>
      </g>
      <g id="${prefix}ArmR"></g><g id="${prefix}ArmL"></g>
    </g>`;
  }

  // Face state: blink 0-1, closed 0-1, gaze [dx, dy] (iris shift), smile 0-1, brow 0-1, glow 0-1.
  function characterFace(prefix, { blink = 0, closed = 0, gaze = [0, 0], smile = 0.4, brow = 0, glow = 0 }) {
    const shut = Math.max(blink, closed);
    for (const [s, x] of [['L', -44], ['R', 44]]) {
      document.getElementById(prefix + 'Eye' + s).setAttribute('transform', `translate(0 778) scale(1 ${Math.max(0.08, 1 - shut)}) translate(0 -778)`);
      document.getElementById(prefix + 'Iris' + s).setAttribute('transform', `translate(${Math.max(-8, Math.min(8, gaze[0]))} ${Math.max(-4, Math.min(4, gaze[1]))})`);
    }
    document.getElementById(prefix + 'Brows').setAttribute('transform', `translate(0 ${-brow * 12})`);
    const w = 28 + smile * 8, d = smile * 32;
    const mouth = document.getElementById(prefix + 'Mouth');
    if (smile > 0.7) {
      mouth.setAttribute('d', `M${-w},872 Q0,${872 + d * 1.25} ${w},872 Q0,${876 + d * 0.3} ${-w},872 Z`);
      mouth.setAttribute('fill', '#FFFFFF');
    } else {
      mouth.setAttribute('d', `M${-w},872 Q0,${872 + d} ${w},872`);
      mouth.setAttribute('fill', 'none');
    }
    document.getElementById(prefix + 'Glow').setAttribute('opacity', glow);
  }

  // One arm from shoulder S through elbow E to hand H, in the character's sleeve.
  function characterArm(el, key, S, E, H, { shabbat = false } = {}) {
    const c = outfit(CHARACTERS[key], shabbat);
    const sleeve = c.coat ? c.jacket : c.shirt;
    const edge = darken(sleeve, c.coat ? 0.4 : 0.22);
    const lerp = (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
    const cuffA = lerp(E, H, 0.7), cuffB = lerp(E, H, 0.8);
    const cuff = c.coat ? `<path d="M${cuffA[0]},${cuffA[1]} L${cuffB[0]},${cuffB[1]}" stroke="${c.shirt}" stroke-width="70" stroke-linecap="round"/>` : '';
    el.innerHTML = `
      <path d="M${S[0]},${S[1]} L${E[0]},${E[1]} L${cuffA[0]},${cuffA[1]}" fill="none" stroke="${edge}" stroke-width="94" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${S[0]},${S[1]} L${E[0]},${E[1]} L${cuffA[0]},${cuffA[1]}" fill="none" stroke="${sleeve}" stroke-width="80" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${S[0] + (S[0] < 0 ? 16 : -16)},${S[1] + 14} L${E[0] + (S[0] < 0 ? 14 : -14)},${E[1] - 4}" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity=".12"/>
      ${cuff}
      <circle cx="${H[0]}" cy="${H[1]}" r="38" fill="${c.skin}" stroke="${c.shade}" stroke-width="4"/>
      <ellipse cx="${H[0] + (S[0] < 0 ? 26 : -26)}" cy="${H[1] - 18}" rx="14" ry="22" fill="${c.skin}" stroke="${c.shade}" stroke-width="3" transform="rotate(${S[0] < 0 ? 30 : -30} ${H[0]} ${H[1]})"/>`;
  }

  Object.assign(window, { CHARACTERS, characterSVG, characterFace, characterArm });
})();
