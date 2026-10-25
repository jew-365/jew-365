import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n';
import { addonMegabytes } from '@/services/addons/addonContent';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { AddonDownload, AddonInstall, AddonManifest } from '@/types/addon';

export type AddonCopy = 'chok.addon' | 'selichot.addon';

export type AddonSource<M extends AddonManifest> = {
  supported: () => boolean;
  prepare: () => Promise<M | null>;
  install: (manifest: M) => Promise<boolean>;
  cancel: () => void;
  remove: () => void;
  checkUpdate: () => Promise<void>;
  downloadBytes: (manifest: M) => number;
};

type Translate = (key: string, o?: Record<string, unknown>) => string;

export function addonCaption(
  copy: AddonCopy,
  estimateMb: number,
  download: AddonDownload,
  t: Translate,
  params: Record<string, string> = {},
): string {
  if (download.status === 'downloading') {
    return t(`${copy}.progressShort`, { done: String(download.done), total: String(download.total), ...params });
  }
  if (download.status === 'failed') return t(`${copy}.failedShort`, params);
  return t(`${copy}.listCaption`, { size: String(estimateMb), ...params });
}

export function useAddonDownloadFlow<M extends AddonManifest>({
  copy,
  source,
  installed,
  params = {},
  cancelLabel,
  onCancel,
}: {
  copy: AddonCopy;
  source: AddonSource<M>;
  installed: boolean;
  params?: Record<string, string>;
  cancelLabel?: string;
  onCancel?: () => void;
}): {
  preparing: boolean;
  prepare: () => Promise<void>;
  dialog: React.ReactElement;
} {
  const { t } = useI18n();
  const [preparing, setPreparing] = useState(false);
  const [pending, setPending] = useState<M | null>(null);

  const prepare = async () => {
    setPreparing(true);
    const manifest = await source.prepare();
    setPreparing(false);
    setPending(manifest);
  };

  const dialog = (
    <ConfirmDialog
      visible={pending !== null}
      title={t(installed ? `${copy}.updateTitle` : `${copy}.downloadTitle`, params)}
      body={t(`${copy}.downloadBody`, { size: addonMegabytes(pending ? source.downloadBytes(pending) : 0), ...params })}
      confirmLabel={installed ? t(`${copy}.update`) : t(`${copy}.downloadConfirm`)}
      cancelLabel={cancelLabel}
      onConfirm={() => {
        const manifest = pending;
        setPending(null);
        if (manifest) void source.install(manifest);
      }}
      onCancel={() => {
        setPending(null);
        onCancel?.();
      }}
    />
  );

  return { preparing, prepare, dialog };
}

export function AddonCard<M extends AddonManifest>({
  copy,
  source,
  installed,
  download,
  updateAvailable,
  estimateMb,
  spaceNeededMb,
  params = {},
  footer,
}: {
  copy: AddonCopy;
  source: AddonSource<M>;
  installed: AddonInstall | null;
  download: AddonDownload;
  updateAvailable: boolean;
  estimateMb: number;
  spaceNeededMb: number;
  params?: Record<string, string>;
  footer?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { preparing, prepare, dialog } = useAddonDownloadFlow({ copy, source, installed: installed !== null, params });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void source.checkUpdate();
  }, [source]);

  const failure =
    download.status === 'failed' ? (
      <Banner
        tone="urgent"
        text={
          download.reason === 'space'
            ? t(`${copy}.error.space`, { size: String(spaceNeededMb), ...params })
            : t(`${copy}.error.${download.reason}`, params)
        }
      />
    ) : null;

  let body: React.ReactNode;
  if (!source.supported()) {
    body = <Text style={[typography.body, { color: colors.textSub }]}>{t(`${copy}.webOnly`)}</Text>;
  } else if (download.status === 'downloading') {
    body = (
      <>
        <Text style={[typography.body, { color: colors.text }]}>
          {t(`${copy}.progress`, {
            done: download.done,
            total: download.total,
            mb: addonMegabytes(download.bytes),
            totalMb: addonMegabytes(download.totalBytes),
            ...params,
          })}
        </Text>
        <Button variant="secondary" label={t(`${copy}.cancel`)} onPress={source.cancel} />
      </>
    );
  } else if (installed) {
    body = (
      <>
        <Text style={[typography.body, { color: colors.text }]}>
          {t(`${copy}.installed`, { size: addonMegabytes(installed.bytes), ...params })}
        </Text>
        {failure}
        {updateAvailable ? (
          <>
            <Banner tone="accent" text={t(`${copy}.updateAvailable`)} />
            <Button label={t(`${copy}.update`)} busy={preparing} onPress={prepare} />
          </>
        ) : null}
        <Button variant="danger" size="compact" label={t(`${copy}.delete`)} onPress={() => setConfirmDelete(true)} />
      </>
    );
  } else {
    body = (
      <>
        <Text style={[typography.body, { color: colors.textSub }]}>{t(`${copy}.about`, params)}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {t(`${copy}.estimate`, { size: String(estimateMb), ...params })}
        </Text>
        {failure}
        <Button
          label={download.status === 'failed' ? t(`${copy}.retry`) : t(`${copy}.download`)}
          busy={preparing}
          onPress={prepare}
        />
      </>
    );
  }

  return (
    <Card padded>
      <Text style={[typography.subheading, { color: colors.text }]}>{t(`${copy}.title`, params)}</Text>
      <View style={{ gap: spacing.md }}>{body}</View>
      {footer}
      {dialog}
      <ConfirmDialog
        destructive
        visible={confirmDelete}
        title={t(`${copy}.deleteTitle`)}
        body={t(`${copy}.deleteBody`)}
        confirmLabel={t(`${copy}.deleteConfirm`)}
        onConfirm={() => {
          setConfirmDelete(false);
          source.remove();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
  );
}
