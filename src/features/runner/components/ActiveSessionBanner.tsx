import { StyleSheet, Text, View } from 'react-native';
import type { ActiveSessionSummary } from '../../routines/hooks/useRoutines';
import { AppButton } from '../../../shared/components/AppButton';
import { Card } from '../../../shared/components/Layout';
import { colors, fontSizes, spacing } from '../../../shared/theme';

/**
 * Home Banner for the active session (R020).
 *
 * It renders `routineName` and step count from the session snapshot, so it keeps
 * working after the source Routine was renamed or deleted, and 继续 always
 * resumes the same session instead of starting a new one.
 */
export function ActiveSessionBanner({
  session,
  onContinue,
  busy = false,
}: {
  session: ActiveSessionSummary;
  onContinue: () => void;
  busy?: boolean;
}) {
  return (
    <View testID="home-active-session-banner">
      <Card style={styles.card}>
        <Text style={styles.label} maxFontSizeMultiplier={1.5}>
          正在进行的流程
        </Text>
        <Text
          style={styles.name}
          maxFontSizeMultiplier={1.5}
          accessibilityRole="header"
          testID="home-active-session-name"
        >
          {session.routineName}
        </Text>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
          {`${session.stepCount} 个动作`}
        </Text>
        <AppButton
          label="继续"
          onPress={onContinue}
          disabled={busy}
          testID="home-continue-session"
          accessibilityHint="回到正在进行的流程"
          style={styles.action}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.primary,
  },
  label: {
    fontSize: fontSizes.meta,
    fontWeight: '700',
    color: colors.primary,
  },
  name: {
    marginTop: spacing.xs,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
  },
  action: {
    marginTop: spacing.md,
  },
});
