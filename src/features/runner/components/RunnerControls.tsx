import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { spacing } from '../../../shared/theme';

/**
 * Playback controls (T053, FR-021..FR-025).
 *
 * Every control updates authoritative runner state; none of them just nudges a
 * visual counter (Constitution X).
 */
export function RunnerControls({
  isPaused,
  canGoPrevious,
  canAddTime,
  onPrevious,
  onTogglePause,
  onAddTime,
  onSkip,
  onEnd,
}: {
  isPaused: boolean;
  canGoPrevious: boolean;
  canAddTime: boolean;
  onPrevious: () => void;
  onTogglePause: () => void;
  onAddTime: () => void;
  onSkip: () => void;
  onEnd: () => void;
}) {
  return (
    <View>
      <AppButton
        label={isPaused ? '继续' : '暂停'}
        onPress={onTogglePause}
        testID="runner-pause"
        accessibilityHint={isPaused ? '继续当前流程' : '暂停当前流程'}
        style={styles.primary}
      />
      <View style={styles.row}>
        <AppButton
          label="上一个"
          variant="secondary"
          onPress={onPrevious}
          disabled={!canGoPrevious}
          testID="runner-previous"
          accessibilityHint={canGoPrevious ? '回到上一个动作并重新计时' : '已经是第一个动作'}
        />
        <AppButton
          label="+10 秒"
          variant="secondary"
          onPress={onAddTime}
          disabled={!canAddTime}
          testID="runner-add-time"
          accessibilityHint="当前动作延长 10 秒"
        />
        <AppButton
          label="跳过"
          variant="secondary"
          onPress={onSkip}
          testID="runner-skip"
          accessibilityHint="直接进入下一个动作"
        />
      </View>
      <AppButton
        label="结束流程"
        variant="danger"
        onPress={onEnd}
        testID="runner-end"
        accessibilityHint="结束本次流程"
        style={styles.end}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  end: {
    marginTop: spacing.sm,
  },
});
