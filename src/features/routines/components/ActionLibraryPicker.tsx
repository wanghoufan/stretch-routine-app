import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Action } from '../../../domain/action/Action';
import { formatDuration } from '../../../shared/utils/format';
import { AppButton } from '../../../shared/components/AppButton';
import { colors, fontSizes, spacing } from '../../../shared/theme';
import { ActionFilterBar } from '../../actions/components/ActionFilterBar';
import {
  ACTION_SCENES,
  ALL_BODY_PART,
  bodyPartChipsForScene,
  groupActions,
  resolveBodyPartFilter,
  type ActionScene,
  type BodyPartFilter,
} from '../../actions/services/actionGroups';

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
  const [query, setQuery] = useState('');
  const [activeScene, setActiveScene] = useState<ActionScene>(ACTION_SCENES[0]);
  const [bodyPart, setBodyPart] = useState<BodyPartFilter>(ALL_BODY_PART);
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      setSelectedIds([]);
      setQuery('');
      setActiveScene(ACTION_SCENES[0]);
      setBodyPart(ALL_BODY_PART);
      setExpandedOverrides({});
    }
  }, [visible]);

  const chips = useMemo(() => bodyPartChipsForScene(actions, activeScene), [actions, activeScene]);
  const resolvedBodyPart = resolveBodyPartFilter(bodyPart, chips);
  const groups = useMemo(
    () => groupActions(actions, { query, bodyPart: resolvedBodyPart }, activeScene),
    [actions, query, resolvedBodyPart, activeScene],
  );
  const searchActive = query.trim().length > 0;
  const isExpanded = (key: string) =>
    expandedOverrides[key] ?? (searchActive || key === `library-group-${activeScene}`);

  const toggleGroup = (scene: ActionScene, key: string) => {
    if (scene !== activeScene) {
      setActiveScene(scene);
      setBodyPart(ALL_BODY_PART);
      setExpandedOverrides((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setExpandedOverrides((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? (searchActive || key === `library-group-${activeScene}`)),
    }));
  };

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
            {`从动作库添加（共 ${actions.length} 个）`}
          </Text>
          {actions.length === 0 ? (
            <Text style={styles.empty} maxFontSizeMultiplier={1.5}>
              动作库还是空的。先在动作库中创建常用动作。
            </Text>
          ) : (
            <ScrollView style={styles.list}>
              <ActionFilterBar
                query={query}
                onQueryChange={setQuery}
                activeScene={activeScene}
                activeSceneEmpty={!groups.some((group) => group.scene === activeScene)}
                bodyPart={resolvedBodyPart}
                bodyPartChips={chips}
                onBodyPartChange={setBodyPart}
              />
              {groups.length === 0 ? (
                <Text style={styles.empty} maxFontSizeMultiplier={1.5}>
                  没有匹配的动作，换个关键词或部位试试。
                </Text>
              ) : (
                groups.map((group) => {
                  const expanded = isExpanded(group.key);
                  return (
                    <View key={group.key}>
                      <Pressable
                        testID={`${group.key}-header`}
                        onPress={() => toggleGroup(group.scene, group.key)}
                        style={styles.groupHeader}
                      >
                        <Text style={styles.groupTitle} maxFontSizeMultiplier={1.4}>
                          {group.scene}
                        </Text>
                        <Text testID={`${group.key}-count`} style={styles.groupCount}>
                          {group.count}
                        </Text>
                        <Text style={styles.groupToggle}>{expanded ? '收起' : '展开'}</Text>
                      </Pressable>
                      {expanded
                        ? group.actions.map((action) => {
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
                          })
                        : null}
                    </View>
                  );
                })
              )}
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
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  groupTitle: {
    fontSize: fontSizes.title,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  groupCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  groupToggle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});
