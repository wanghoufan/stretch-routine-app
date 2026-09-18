import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { spacing } from '../../../shared/theme';

/** Per-step actions: reorder, duplicate, delete (T031, T030). */
export function StepActions({
  stepName,
  /** 1-based position, used for stable test IDs and labels. */
  index,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: {
  stepName: string;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <AppButton
        label="上移"
        variant="secondary"
        onPress={onMoveUp}
        disabled={!canMoveUp}
        testID={`step-${index}-move-up`}
        accessibilityHint={`把${stepName}向前移动一位`}
      />
      <AppButton
        label="下移"
        variant="secondary"
        onPress={onMoveDown}
        disabled={!canMoveDown}
        testID={`step-${index}-move-down`}
        accessibilityHint={`把${stepName}向后移动一位`}
      />
      <AppButton
        label="复制"
        variant="secondary"
        onPress={onDuplicate}
        testID={`step-${index}-duplicate`}
        accessibilityHint={`复制${stepName}`}
      />
      <AppButton
        label="删除"
        variant="danger"
        onPress={onDelete}
        testID={`step-${index}-delete`}
        accessibilityHint={`从流程中删除${stepName}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
