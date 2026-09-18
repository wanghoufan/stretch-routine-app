import { StyleSheet, Text, View } from 'react-native';
import type { RoutineSummary } from '../../../domain/routine/Routine';
import { formatDuration } from '../../../shared/utils/format';
import { colors, spacing } from '../../../shared/theme';
import { AppButton } from '../../../shared/components/AppButton';

/**
 * Home routine card (T036): step count, estimated duration, and the primary
 * Start action. After the app was killed mid-routine the button becomes 继续,
 * which is how recovery is reachable from a cold start (FR-032).
 */
export function RoutineCard({
  summary,
  hasActiveSession,
  onOpen,
  onStart,
}: {
  summary: RoutineSummary;
  hasActiveSession: boolean;
  onOpen: () => void;
  onStart: () => void;
}) {
  const meta = `${summary.stepCount} 个动作 · 约 ${formatDuration(summary.totalDurationSec)}`;

  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name} maxFontSizeMultiplier={1.5} accessibilityRole="header">
          {summary.name}
        </Text>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
          {meta}
        </Text>
        {hasActiveSession ? (
          <Text style={styles.resumeHint} maxFontSizeMultiplier={1.5}>
            上次还没结束
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <AppButton
          label={hasActiveSession ? '继续' : '开始'}
          onPress={onStart}
          accessibilityHint={hasActiveSession ? '继续上次未完成的流程' : '从头开始这个流程'}
          testID={`routine-start-${summary.id}`}
        />
        <AppButton
          label="详情"
          variant="secondary"
          onPress={onOpen}
          accessibilityHint="查看与编辑流程内容"
          testID={`routine-open-${summary.id}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  info: {
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
  resumeHint: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
