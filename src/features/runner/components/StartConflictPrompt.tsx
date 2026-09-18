import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { NoticeBanner } from '../../../shared/components/NoticeBanner';
import { spacing } from '../../../shared/theme';

/**
 * Three-way conflict prompt (R017).
 *
 * Shown when the user tries to start routine B while routine A is still
 * running. Nothing changes until the user picks one of the three options:
 *
 *   1. 继续当前流程            -> keep A, go to the Runner
 *   2. 结束当前并开始新的       -> explicit replace, then start B
 *   3. 取消                    -> no change
 */
export function StartConflictPrompt({
  currentRoutineName,
  onContinue,
  onReplace,
  onCancel,
  busy = false,
}: {
  currentRoutineName: string;
  onContinue: () => void;
  onReplace: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <View testID="start-conflict-prompt">
      <NoticeBanner
        tone="warning"
        title="已有正在进行的流程"
        message={`「${currentRoutineName}」还在进行中，要先怎么处理？`}
      />
      <AppButton
        label="继续当前流程"
        onPress={onContinue}
        disabled={busy}
        testID="conflict-continue"
      />
      <AppButton
        label="结束当前并开始新的"
        variant="danger"
        onPress={onReplace}
        disabled={busy}
        testID="conflict-replace"
        style={styles.gap}
      />
      <AppButton
        label="取消"
        variant="secondary"
        onPress={onCancel}
        disabled={busy}
        testID="conflict-cancel"
        style={styles.gap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    marginTop: spacing.sm,
  },
});
