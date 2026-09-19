import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Action } from '../../../domain/action/Action';
import { useNavigation } from '../../../app/navigation/NavigationContext';
import { useServices } from '../../../app/providers/ServicesContext';
import { formatDuration } from '../../../shared/utils/format';
import { AppButton } from '../../../shared/components/AppButton';
import { Card, EmptyState } from '../../../shared/components/Layout';
import { NoticeBanner } from '../../../shared/components/NoticeBanner';
import { Screen } from '../../../shared/components/Screen';
import { colors, radius, spacing } from '../../../shared/theme';
import { ActionEditor, type ActionEditorValues } from '../components/ActionEditor';
import { ActionFilterBar } from '../components/ActionFilterBar';
import {
  ACTION_SCENES,
  bodyPartChipsForScene,
  DEFAULT_ACTION_FILTERS,
  groupActions,
  resolveBodyPartFilter,
  type ActionFilters,
  type ActionScene,
  type ActionSceneGroup,
} from '../services/actionGroups';
import {
  createLibraryAction,
  listLibraryActions,
  updateLibraryAction,
} from '../services/actionLibraryService';
import { buildDeleteActionMessage, countActionUsage, deleteAction } from '../services/deleteAction';

/**
 * Reusable Action library (T074, FR-011..FR-015; grouped by TASK-014 B-3).
 *
 * Routines never read from here during playback: they use their own step
 * snapshots, which is why editing or deleting an Action is safe.
 *
 * The list is grouped by 场景 (拉伸/热身/核心训练), all flat. The active scene is
 * the target of the body-part chips (默认拉伸); tapping another scene's header
 * claims it and keeps it expanded, while tapping the active scene toggles it.
 * The search box filters every scene by name. Selecting a body part never
 * force-opens another group.
 */
export function ActionLibraryScreen() {
  const services = useServices();
  const navigation = useNavigation();

  const [actions, setActions] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActionFilters>(DEFAULT_ACTION_FILTERS);
  const [activeScene, setActiveScene] = useState<ActionScene>(ACTION_SCENES[0]);
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    try {
      setActions(await listLibraryActions(services.actions));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取动作库失败');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = useMemo(
    () => groupActions(actions, filters, activeScene),
    [actions, filters, activeScene],
  );
  const bodyPartChips = useMemo(
    () => bodyPartChipsForScene(actions, activeScene),
    [actions, activeScene],
  );
  // Search opens every remaining group so hits are visible. The body-part pick
  // must not, so it is deliberately excluded from this flag.
  const searchActive = filters.query.trim().length > 0;
  // The default open group is fixed to the first scene (拉伸) and never drifts
  // with the active scene, so expanding another group keeps this one open.
  const defaultOpenKey = `library-group-${ACTION_SCENES[0]}`;
  const isExpanded = (key: string) =>
    expandedOverrides[key] ?? (searchActive || key === defaultOpenKey);
  // Tapping any other scene's header claims it for the chips right away (and
  // keeps it expanded this tap); tapping the current active scene toggles it.
  const toggleGroup = (scene: ActionScene, key: string) => {
    if (scene !== activeScene) {
      setActiveScene(scene);
      setFilters((previous) =>
        previous.bodyPart === DEFAULT_ACTION_FILTERS.bodyPart
          ? previous
          : { ...previous, bodyPart: DEFAULT_ACTION_FILTERS.bodyPart },
      );
      setExpandedOverrides((previous) =>
        previous[key] ? previous : { ...previous, [key]: true },
      );
      return;
    }
    setExpandedOverrides((previous) => ({ ...previous, [key]: !isExpanded(key) }));
  };
  const activeSceneEmpty = !groups.some((group) => group.scene === activeScene);

  // A refresh can remove the selected part; fall back to 全部 rather than keep
  // a hidden selection with no matching chip.
  useEffect(() => {
    setFilters((previous) => {
      const bodyPart = resolveBodyPartFilter(previous.bodyPart, bodyPartChips);
      return bodyPart === previous.bodyPart ? previous : { ...previous, bodyPart };
    });
  }, [bodyPartChips]);

  const submit = useCallback(
    async (values: ActionEditorValues) => {
      try {
        if (editing) {
          await updateLibraryAction(services.actions, editing.id, values);
        } else {
          await createLibraryAction(services.actions, values);
        }
        await refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : '保存动作失败');
      }
    },
    [editing, services, refresh],
  );

  const confirmDelete = useCallback(
    async (action: Action) => {
      const usage = await countActionUsage(services.db, action.id);
      Alert.alert('删除动作', buildDeleteActionMessage(action.name, usage), [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAction(services.actions, services.db, action.id);
                await refresh();
              } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : '删除动作失败');
              }
            })();
          },
        },
      ]);
    },
    [services, refresh],
  );

  const renderAction = (action: Action) => (
    <Card key={action.id}>
      <Text style={styles.name} maxFontSizeMultiplier={1.5}>
        {action.name}
      </Text>
      <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
        {`${action.sideMode === 'bilateral' ? '左右配对' : '单侧'} · 默认 ${formatDuration(action.defaultDurationSec)}`}
      </Text>
      <View style={styles.row}>
        <AppButton
          label="编辑"
          variant="secondary"
          onPress={() => {
            setEditing(action);
            setEditorVisible(true);
          }}
          testID={`action-edit-${action.id}`}
        />
        <AppButton
          label="删除"
          variant="danger"
          onPress={() => {
            void confirmDelete(action);
          }}
          testID={`action-delete-${action.id}`}
        />
      </View>
    </Card>
  );

  const renderGroup = (group: ActionSceneGroup) => {
    const expanded = isExpanded(group.key);
    return (
      <View key={group.key}>
        <Pressable
          testID={group.key}
          onPress={() => toggleGroup(group.scene, group.key)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${group.scene}，${group.count}个动作`}
          accessibilityHint={expanded ? '收起这一组' : '展开这一组'}
          style={({ pressed }) => [styles.groupHeader, pressed ? styles.groupHeaderPressed : null]}
        >
          <Text style={styles.groupTitle} maxFontSizeMultiplier={1.5}>
            {group.scene}
          </Text>
          <Text
            style={styles.groupBadge}
            maxFontSizeMultiplier={1.4}
            testID={`${group.key}-count`}
          >
            {group.count}
          </Text>
          <Text style={styles.groupChevron} maxFontSizeMultiplier={1.4}>
            {expanded ? '收起' : '展开'}
          </Text>
        </Pressable>

        {expanded ? group.actions.map(renderAction) : null}
      </View>
    );
  };

  return (
    <Screen
      title="动作库"
      onBack={navigation.goBack}
      headerRight={
        <AppButton
          label="新建"
          onPress={() => {
            setEditing(null);
            setEditorVisible(true);
          }}
          testID="action-library-new"
        />
      }
    >
      {error ? <NoticeBanner tone="error" title="动作库出错" message={error} /> : null}

      {!loading && actions.length === 0 ? (
        <EmptyState
          title="动作库还是空的"
          description="把常做的动作存进动作库，之后新建流程时可以一次选好几个。"
          actionLabel="新建动作"
          onAction={() => {
            setEditing(null);
            setEditorVisible(true);
          }}
        />
      ) : null}

      {!loading && actions.length > 0 ? (
        <>
          <ActionFilterBar
            query={filters.query}
            onQueryChange={(query) => setFilters((previous) => ({ ...previous, query }))}
            activeScene={activeScene}
            activeSceneEmpty={activeSceneEmpty}
            bodyPart={filters.bodyPart}
            bodyPartChips={bodyPartChips}
            onBodyPartChange={(bodyPart) => setFilters((previous) => ({ ...previous, bodyPart }))}
          />

          {groups.length === 0 ? (
            <View style={styles.emptyResult} testID="library-empty">
              <Text style={styles.emptyResultTitle} maxFontSizeMultiplier={1.5}>
                没有符合条件的动作
              </Text>
              <Text style={styles.emptyResultDescription} maxFontSizeMultiplier={1.5}>
                换个部位，或清空搜索词再试试。
              </Text>
              <AppButton
                label="清除筛选"
                variant="secondary"
                onPress={() => setFilters(DEFAULT_ACTION_FILTERS)}
                testID="library-clear-filters"
                style={styles.clearButton}
              />
            </View>
          ) : (
            groups.map(renderGroup)
          )}
        </>
      ) : null}

      <ActionEditor
        visible={editorVisible}
        action={editing}
        onClose={() => setEditorVisible(false)}
        onSubmit={(values) => {
          void submit(values);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  groupHeaderPressed: {
    backgroundColor: colors.accentSoft,
  },
  groupTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  groupBadge: {
    minWidth: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  groupChevron: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyResult: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyResultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyResultDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  clearButton: {
    minWidth: 140,
  },
});
