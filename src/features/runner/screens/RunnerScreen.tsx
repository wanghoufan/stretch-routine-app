import { useEffect, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '../../../app/navigation/NavigationContext';
import { useSpeech } from '../../../app/providers/SpeechContext';
import { formatClock, formatDuration } from '../../../shared/utils/format';
import { Card } from '../../../shared/components/Layout';
import { NoticeBanner } from '../../../shared/components/NoticeBanner';
import { Screen } from '../../../shared/components/Screen';
import { ActionIconTile } from '../../../shared/components/ActionIconTile';
import { actionIconFor } from '../../../shared/assets/actionIcons';
import { colors, fontSizes, radius, spacing } from '../../../shared/theme';
import { RunnerControls } from '../components/RunnerControls';
import { useRunner } from '../hooks/useRunner';

/**
 * Runner screen (T041).
 *
 * Renders the authoritative session; the visible countdown is only a
 * presentation of timestamp-derived state (Constitution §3.3).
 */
export function RunnerScreen() {
  const navigation = useNavigation();
  const { ttsError, dismissTtsError } = useSpeech();
  const { view, togglePause, addTime, previous, skip, end } = useRunner({});

  const navigatedRef = useRef<'idle' | 'completed' | 'stopped'>('idle');

  useEffect(() => {
    if (navigatedRef.current !== 'idle') {
      return;
    }
    if (view.isFinished && view.routineName) {
      navigatedRef.current = 'completed';
      navigation.replace('Completion', {
        routineId: view.routineId ?? '',
        routineName: view.routineName,
        stepCount: view.stepCount,
        elapsedMs: view.elapsedMs,
      });
      return;
    }
    if (view.isStopped) {
      navigatedRef.current = 'stopped';
      navigation.reset('Home', undefined);
    }
  }, [
    view.isFinished,
    view.isStopped,
    view.routineId,
    view.routineName,
    view.stepCount,
    view.elapsedMs,
    navigation,
  ]);

  const confirmEnd = () => {
    Alert.alert('结束流程', '确定要结束当前流程吗？已经完成的部分不会保存。', [
      { text: '继续练习', style: 'cancel' },
      { text: '结束', style: 'destructive', onPress: end },
    ]);
  };

  if (view.status === 'loading') {
    return (
      <Screen title="进行中" scroll={false}>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
          正在载入…
        </Text>
      </Screen>
    );
  }

  if (view.status !== 'ready') {
    return (
      <Screen title="进行中" onBack={navigation.goBack}>
        <NoticeBanner
          tone="error"
          title="无法继续流程"
          message={view.errorMessage ?? '没有进行中的流程'}
          actionLabel="返回"
          onAction={() => navigation.reset('Home', undefined)}
        />
      </Screen>
    );
  }

  const isTransition = view.isTransition;
  const headline = isTransition ? '准备下一个动作' : (view.currentStep?.displayName ?? '');
  const speakPreview = isTransition ? view.transitionTarget?.speakText : view.currentStep?.speakText;

  return (
    <Screen title={view.routineName ?? '进行中'} onBack={confirmEnd} scroll={false}>
      {ttsError ? (
        <NoticeBanner
          tone="warning"
          title="语音暂时不可用"
          message={`${ttsError}（计时与画面不受影响，可继续跟练）`}
          actionLabel="知道了"
          onAction={dismissTtsError}
        />
      ) : null}

      <Card style={styles.card}>
        <ActionIconTile source={actionIconFor(headline)} size={96} style={styles.heroTile} />
        <Text style={styles.position} maxFontSizeMultiplier={1.5}>
          {`第 ${view.stepPosition} / ${view.stepCount} 个`}
        </Text>
        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.4}
          accessibilityRole="header"
          testID="runner-current-step"
        >
          {headline}
        </Text>
        <Text
          style={styles.countdown}
          maxFontSizeMultiplier={1.4}
          testID="runner-remaining"
          accessibilityLabel={`剩余 ${formatClock(view.remainingMs)}`}
        >
          {formatClock(view.remainingMs)}
        </Text>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5} testID="runner-phase">
          {isTransition
            ? `过渡中 · 接着做 ${view.transitionTarget?.displayName ?? ''}`
            : `本动作 ${formatDuration(Math.round((view.currentStep?.durationSec ?? 0)))}`}
        </Text>
        {view.isPaused ? (
          <Text style={styles.paused} maxFontSizeMultiplier={1.5} testID="runner-paused">
            已暂停
          </Text>
        ) : null}

        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel="流程进度"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(view.progress * 100) }}
        >
          <View style={[styles.progressFill, { width: `${Math.round(view.progress * 100)}%` }]} />
        </View>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
          {`已用 ${formatClock(view.elapsedMs)} / 共约 ${formatDuration(Math.round(view.totalMs / 1000))}`}
        </Text>
      </Card>

      {view.nextStep && !isTransition ? (
        <Text style={styles.next} maxFontSizeMultiplier={1.5} testID="runner-next-step">
          {`下一个：${view.nextStep.displayName}`}
        </Text>
      ) : null}

      {speakPreview ? (
        <Text style={styles.speak} maxFontSizeMultiplier={1.5}>
          {`语音：${speakPreview}`}
        </Text>
      ) : null}

      <RunnerControls
        isPaused={view.isPaused}
        canGoPrevious={view.canGoPrevious}
        canAddTime={view.canAddTime}
        onPrevious={previous}
        onTogglePause={togglePause}
        onAddTime={addTime}
        onSkip={skip}
        onEnd={confirmEnd}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.sm,
  },
  heroTile: {
    marginBottom: spacing.md,
  },
  position: {
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  countdown: {
    fontSize: fontSizes.display,
    fontWeight: '800',
    color: colors.primary,
    marginVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    textAlign: 'center',
  },
  paused: {
    marginTop: spacing.sm,
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: colors.warningText,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  next: {
    marginTop: spacing.md,
    fontSize: fontSizes.body,
    color: colors.text,
  },
  speak: {
    marginTop: spacing.sm,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
  },
});
