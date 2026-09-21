import { StyleSheet, Text, View } from 'react-native';
import type { RoutineSummary } from '../../../domain/routine/Routine';
import { formatDuration } from '../../../shared/utils/format';
import { colors, radius, spacing } from '../../../shared/theme';
import { AppButton } from '../../../shared/components/AppButton';
import { ActionIconTile } from '../../../shared/components/ActionIconTile';
import { sceneIconFor } from '../../../shared/assets/actionIcons';

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
  badge,
  scene,
}: {
  summary: RoutineSummary;
  hasActiveSession: boolean;
  onOpen: () => void;
  onStart: () => void;
  /** Optional 角标, e.g. the 低/中/高 difficulty on 核心 templates (TASK-014). */
  badge?: string;
  /** Scene group for the display-only icon tile (defaults to 全身拉伸). */
  scene?: string;
}) {
  const meta = `${summary.stepCount} 个动作 · 约 ${formatDuration(summary.totalDurationSec)}`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <ActionIconTile source={sceneIconFor(scene ?? '')} size={64} />
        <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} maxFontSizeMultiplier={1.5} accessibilityRole="header">
            {summary.name}
          </Text>
          {badge ? (
            <Text
              style={styles.badge}
              maxFontSizeMultiplier={1.4}
              testID={`routine-badge-${summary.id}`}
              accessibilityLabel={`难度${badge}`}
            >
              {badge}
            </Text>
          ) : null}
        </View>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
          {meta}
        </Text>
        {hasActiveSession ? (
          <Text style={styles.resumeHint} maxFontSizeMultiplier={1.5}>
            上次还没结束
          </Text>
        ) : null}
        </View>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
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
