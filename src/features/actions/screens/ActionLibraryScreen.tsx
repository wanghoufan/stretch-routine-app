import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { Action } from '../../../domain/action/Action';
import { useNavigation } from '../../../app/navigation/NavigationContext';
import { useServices } from '../../../app/providers/ServicesContext';
import { formatDuration } from '../../../shared/utils/format';
import { AppButton } from '../../../shared/components/AppButton';
import { Card, EmptyState } from '../../../shared/components/Layout';
import { NoticeBanner } from '../../../shared/components/NoticeBanner';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme';
import { ActionEditor, type ActionEditorValues } from '../components/ActionEditor';
import {
  createLibraryAction,
  listLibraryActions,
  updateLibraryAction,
} from '../services/actionLibraryService';
import { buildDeleteActionMessage, countActionUsage, deleteAction } from '../services/deleteAction';

/**
 * Reusable Action library (T074, FR-011..FR-015).
 *
 * Routines never read from here during playback: they use their own step
 * snapshots, which is why editing or deleting an Action is safe.
 */
export function ActionLibraryScreen() {
  const services = useServices();
  const navigation = useNavigation();

  const [actions, setActions] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);

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

      {actions.map((action) => (
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
      ))}

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
});
