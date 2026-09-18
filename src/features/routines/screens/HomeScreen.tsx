import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '../../../app/navigation/NavigationContext';
import { useServices } from '../../../app/providers/ServicesContext';
import { useSettings } from '../../../app/providers/SettingsContext';
import { useSpeech } from '../../../app/providers/SpeechContext';
import { AppButton } from '../../../shared/components/AppButton';
import { EmptyState, SectionTitle } from '../../../shared/components/Layout';
import { NoticeBanner } from '../../../shared/components/NoticeBanner';
import { Screen } from '../../../shared/components/Screen';
import { spacing } from '../../../shared/theme';
import { ActiveSessionBanner } from '../../runner/components/ActiveSessionBanner';
import { StartConflictPrompt } from '../../runner/components/StartConflictPrompt';
import { useStartRoutine } from '../../runner/hooks/useStartRoutine';
import { RoutineCard } from '../components/RoutineCard';
import { useRoutines } from '../hooks/useRoutines';

/**
 * Home / 我的流程 (T034, FR-001, R020).
 *
 * The primary hands-free entry point: open the app, tap 开始, put the phone down.
 * A running session is surfaced as a Banner so it can be continued even if its
 * source routine was deleted, and starting a second routine asks first.
 */
export function HomeScreen() {
  const navigation = useNavigation();
  const services = useServices();
  const { tts } = useSpeech();
  const { settings } = useSettings();
  const { routines, activeSession, loading, error, refresh } = useRoutines(services);

  const openRunner = useCallback(() => navigation.navigate('Runner', undefined), [navigation]);
  const startFlow = useStartRoutine(services, tts, settings, openRunner);

  const openRoutine = useCallback(
    (routineId: string) => navigation.navigate('RoutineDetail', { routineId }),
    [navigation],
  );

  const startRoutine = useCallback(
    (routineId: string) => {
      void startFlow.start(routineId);
    },
    [startFlow],
  );

  const continueSession = useCallback(() => {
    void startFlow.resume();
  }, [startFlow]);

  return (
    <Screen
      title="我的流程"
      headerRight={
        <>
          <AppButton
            label="动作库"
            variant="secondary"
            onPress={() => navigation.navigate('ActionLibrary', undefined)}
            testID="home-action-library"
          />
          <AppButton
            label="设置"
            variant="secondary"
            onPress={() => navigation.navigate('Settings', undefined)}
            testID="home-settings"
          />
        </>
      }
    >
      {error ? (
        <NoticeBanner
          tone="error"
          title="读取流程失败"
          message={error}
          actionLabel="重试"
          onAction={() => {
            void refresh();
          }}
        />
      ) : null}

      {startFlow.state.status === 'error' ? (
        <NoticeBanner
          tone="error"
          title="无法开始流程"
          message={startFlow.state.message}
          actionLabel="知道了"
          onAction={startFlow.dismissError}
        />
      ) : null}

      {startFlow.state.status === 'conflict' ? (
        <StartConflictPrompt
          currentRoutineName={startFlow.state.currentRoutineName}
          onContinue={() => {
            void startFlow.continueCurrent();
          }}
          onReplace={() => {
            void startFlow.replaceCurrent();
          }}
          onCancel={startFlow.cancel}
          busy={false}
        />
      ) : null}

      {activeSession ? (
        <ActiveSessionBanner
          session={activeSession}
          onContinue={continueSession}
          busy={startFlow.state.status === 'busy'}
        />
      ) : null}

      <AppButton
        label="新建流程"
        onPress={() => navigation.navigate('RoutineEditor', {})}
        testID="home-new-routine"
        style={styles.newButton}
      />

      {loading ? null : routines.length === 0 ? (
        <EmptyState
          title="还没有流程"
          description="创建一个流程，把动作按顺序排好，之后打开就能跟着语音做完。"
          actionLabel="新建流程"
          onAction={() => navigation.navigate('RoutineEditor', {})}
        />
      ) : (
        <View>
          <SectionTitle>共 {routines.length} 个流程</SectionTitle>
          {routines.map((summary) => (
            <RoutineCard
              key={summary.id}
              summary={summary}
              hasActiveSession={activeSession?.routineId === summary.id}
              onOpen={() => openRoutine(summary.id)}
              onStart={() => startRoutine(summary.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newButton: {
    marginTop: spacing.sm,
  },
});
