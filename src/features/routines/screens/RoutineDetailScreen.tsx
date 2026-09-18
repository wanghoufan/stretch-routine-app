import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { RoutineWithSteps } from '../../../data/repositories/routineRepository';
import { useNavigation, useRoute } from '../../../app/navigation/NavigationContext';
import { useServices } from '../../../app/providers/ServicesContext';
import { totalDurationSec } from '../../../domain/routine/duration';
import { formatDuration } from '../../../shared/utils/format';
import { AppButton } from '../../../shared/components/AppButton';
import { Card, SectionTitle } from '../../../shared/components/Layout';
import { NoticeBanner } from '../../../shared/components/NoticeBanner';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme';
import { buildDeleteRoutineMessage, deleteRoutine } from '../services/deleteRoutine';
import { duplicateRoutine } from '../services/duplicateRoutine';

/**
 * Routine detail (T063): inspect the sequence, then start / edit / duplicate /
 * delete it (FR-009, FR-010).
 */
export function RoutineDetailScreen() {
  const { routineId } = useRoute('RoutineDetail');
  const services = useServices();
  const navigation = useNavigation();

  const [loaded, setLoaded] = useState<RoutineWithSteps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await services.routines.getWithSteps(routineId);
      setLoaded(result);
      setError(result ? null : '流程不存在');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取流程失败');
    }
  }, [services, routineId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDuplicate = useCallback(async () => {
    setBusy(true);
    try {
      await duplicateRoutine(services.routines, routineId, { generateId: services.generateId });
      navigation.reset('Home', undefined);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : '复制失败');
    } finally {
      setBusy(false);
    }
  }, [services, routineId, navigation]);

  const confirmDelete = useCallback(() => {
    if (!loaded) {
      return;
    }
    Alert.alert(
      '删除流程',
      buildDeleteRoutineMessage(loaded.routine.name, loaded.steps.length),
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteRoutine(services.routines, routineId);
                navigation.reset('Home', undefined);
              } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : '删除失败');
              }
            })();
          },
        },
      ],
      { cancelable: true },
    );
  }, [loaded, services, routineId, navigation]);

  if (error) {
    return (
      <Screen title="流程详情" onBack={navigation.goBack}>
        <NoticeBanner tone="error" title="无法打开流程" message={error} />
      </Screen>
    );
  }

  if (!loaded) {
    return (
      <Screen title="流程详情" onBack={navigation.goBack}>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
          正在载入…
        </Text>
      </Screen>
    );
  }

  const total = totalDurationSec(loaded.steps);

  return (
    <Screen title="流程详情" onBack={navigation.goBack}>
      <Card>
        <Text style={styles.name} maxFontSizeMultiplier={1.5} accessibilityRole="header">
          {loaded.routine.name}
        </Text>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
          {`${loaded.steps.length} 个动作 · 约 ${formatDuration(total)}`}
        </Text>
      </Card>

      <AppButton
        label="开始流程"
        onPress={() => navigation.navigate('Runner', { routineId })}
        testID="detail-start"
      />
      <View style={styles.row}>
        <AppButton
          label="编辑"
          variant="secondary"
          onPress={() => navigation.navigate('RoutineEditor', { routineId })}
          testID="detail-edit"
        />
        <AppButton
          label="复制"
          variant="secondary"
          onPress={handleDuplicate}
          disabled={busy}
          testID="detail-duplicate"
        />
        <AppButton label="删除" variant="danger" onPress={confirmDelete} testID="detail-delete" />
      </View>

      <SectionTitle>动作顺序</SectionTitle>
      {loaded.steps.map((step, index) => (
        <Card key={step.id}>
          <Text style={styles.stepName} maxFontSizeMultiplier={1.5}>
            {`${index + 1}. ${step.displayName}`}
          </Text>
          <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
            {`${formatDuration(step.durationSec)} · 过渡 ${formatDuration(step.transitionSec)}`}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
