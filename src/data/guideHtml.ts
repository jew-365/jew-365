import { GUIDE_TOPICS, guideList, latestWhatsNew, whatsNewHeading } from '@/data/guide';
import { translate, type AppLanguage } from '@/i18n';
import { CONTACT_EMAIL } from '@/services/ContactService';

export const GUIDE_WEB_PAGES: readonly { language: AppLanguage; file: string }[] = [
  { language: 'he', file: 'docs/guide/index.html' },
  { language: 'en', file: 'docs/guide/en/index.html' },
];

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderGuideHtml(language: AppLanguage): string {
  const he = language === 'he';
  const root = he ? '../' : '../../';
  const tr = (key: string) => escapeHtml(translate(key, undefined, language, null));
  const title = he ? `${tr('app.name')} — ${tr('guide.title')}` : `${tr('guide.title')} — ${tr('app.name')}`;
  const footerName = he
    ? `${tr('app.name')} (${escapeHtml(translate('app.name', undefined, 'en', null))})`
    : tr('app.name');

  const lines = [
    '<!doctype html>',
    `<html lang="${language}" dir="${he ? 'rtl' : 'ltr'}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<meta name="description" content="${tr('guide.subtitle')}">`,
    `<link rel="icon" href="${root}favicon.png" sizes="48x48">`,
    `<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">`,
    `<link rel="stylesheet" href="${root}style.css">`,
    '</head>',
    '<body>',
    '<header>',
    `  <a class="brand" href="${root}">${tr('app.name')}</a>`,
    he ? '  <a href="en/">English</a>' : '  <a href="../">עברית</a>',
    '</header>',
    '',
    '<main>',
    `  <h1>${tr('guide.title')}</h1>`,
    `  <p class="meta">${tr('guide.subtitle')}</p>`,
    '',
    `  <h2 id="whats-new">${tr('guide.whatsNew')}</h2>`,
  ];

  for (const entry of latestWhatsNew()) {
    lines.push(`  <h3>${escapeHtml(whatsNewHeading(entry, language))}</h3>`, '  <ul>');
    for (const item of entry.items) lines.push(`    <li>${escapeHtml(item[language])}</li>`);
    lines.push('  </ul>');
  }

  for (const topic of GUIDE_TOPICS) {
    lines.push('', `  <h2 id="${topic.id}">${escapeHtml(topic.title[language])}</h2>`);
    for (const paragraph of topic.body) lines.push(`  <p>${escapeHtml(paragraph[language])}</p>`);
    if (topic.list) {
      const list = guideList(topic.list, language, null);
      lines.push(`  <h3>${escapeHtml(list.title)}</h3>`, '  <ul>');
      for (const { label, items } of list.groups) {
        const heading = label ? `<strong>${escapeHtml(label)}</strong>: ` : '';
        lines.push(`    <li>${heading}${escapeHtml(items.join(' · '))}</li>`);
      }
      lines.push('  </ul>');
    }
  }

  lines.push(
    '</main>',
    '',
    `<footer>${footerName} · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></footer>`,
    '</body>',
    '</html>',
    '',
  );
  return lines.join('\n');
}
