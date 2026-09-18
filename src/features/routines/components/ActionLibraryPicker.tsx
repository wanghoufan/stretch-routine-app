import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Action } from '../../../domain/action/Action';
import { formatDuration } from '../../../shared/utils/format';
import { AppButton } from '../../../shared/components/AppButton';
import { colors, fontSizes, spacing } from '../../../shared/theme';

/**
 * Multi-select "从动作库添加" (T077, FR-014).
 *
 * Bilateral Actions can be added here too; they expand into two ordered steps
 * when added (T070).
 */
export function ActionLibraryPicker({
  visible,
  actions,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  actions: readonly Action[];
  onClose: () => void;
  onConfirm: (selected: Action[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  };

  const confirm = () => {
    // Selection order is preserved so the added step order matches the taps.
    const selected = selectedIds
      .map((id) => actions.find((action) => action.id === id))
      .filter((action): action is Action => Boolean(action));
    onConfirm(selected);
    setSelectedIds([]);
    onClose();
  };

  const close = () => {
    setSelectedIds([]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title} maxFontSizeMultiplier={1.4} accessibilityRole="header">
            从动作库添加
          </Text>
          {actions.length === 0 ? (
            <Text style={styles.empty} maxFontSizeMultiplier={1.5}>
              动作库还是空的。先在动作库中创建常用动作。
            </Text>
          ) : (
            <ScrollView style={styles.list}>
              {actions.map((action) => {
                const selected = selectedIds.includes(action.id);
                const meta = action.sideMode === 'bilateral' ? '左右配对' : '单侧';
                return (
                  <AppButton
                    key={action.id}
                    label={`${selected ? '已选 · ' : ''}${action.name}（${meta}，${formatDuration(action.defaultDurationSec)}）`}
                    variant={selected ? 'primary' : 'secondary'}
                    onPress={() => toggle(action.id)}
                    accessibilityHint={selected ? '取消选择' : '选择这个动作'}
                    style={styles.item}
                    testID={`picker-action-${action.id}`}
                  />
                );
              })}
            </ScrollView>
          )}
          <View style={styles.actions}>
            <AppButton label="取消" variant="secondary" onPress={close} />
            <AppButton
              label={`添加${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
              onPress={confirm}
              disabled={selectedIds.length === 0}
              testID="picker-confirm"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  empty: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  list: {
    marginBottom: spacing.md,
  },
  item: {
    marginBottom: spacing.sm,
    justifyContent: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});
