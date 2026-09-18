import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppButton } from './AppButton';

/** Non-blocking recovery banner, used for persistence and TTS problems. */
export function NoticeBanner({
  tone = 'warning',
  title,
  message,
  actionLabel,
  onAction,
}: {
  tone?: 'warning' | 'error';
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const isError = tone === 'error';
  return (
    <View
      style={[styles.banner, isError ? styles.error : styles.warning]}
      accessibilityRole="alert"
      accessibilityLabel={message ? `${title}。${message}` : title}
    >
      <View style={styles.textArea}>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>
          {title}
        </Text>
        {message ? (
          <Text style={styles.message} maxFontSizeMultiplier={1.5}>
            {message}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
  error: {
    backgroundColor: colors.dangerSoft,
  },
  textArea: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
