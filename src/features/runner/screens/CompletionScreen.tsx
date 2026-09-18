import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '../../../app/navigation/NavigationContext';
import { formatDuration } from '../../../shared/utils/format';
import { AppButton } from '../../../shared/components/AppButton';
import { Card } from '../../../shared/components/Layout';
import { Screen } from '../../../shared/components/Screen';
import { colors, fontSizes, spacing } from '../../../shared/theme';

/** Minimal completion screen (T045, SPEC US1 scenario 5, PLAN §11 F). */
export function CompletionScreen() {
  const params = useRoute('Completion');
  const navigation = useNavigation();

  const elapsedSec = Math.round(params.elapsedMs / 1000);

  return (
    <Screen title="完成" scroll={false}>
      <Card style={styles.card}>
        <Text style={styles.title} maxFontSizeMultiplier={1.4} accessibilityRole="header">
          流程完成
        </Text>
        <Text style={styles.name} maxFontSizeMultiplier={1.5} testID="completion-routine-name">
          {params.routineName}
        </Text>
        <Text style={styles.meta} maxFontSizeMultiplier={1.5} testID="completion-summary">
          {`共 ${params.stepCount} 个动作 · 用时 ${formatDuration(elapsedSec)}`}
        </Text>
      </Card>
      <View style={styles.actions}>
        <AppButton
          label="完成"
          onPress={() => navigation.reset('Home', undefined)}
          testID="completion-done"
          accessibilityHint="回到我的流程"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.lg,
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.success,
  },
  name: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  meta: {
    marginTop: spacing.sm,
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.lg,
  },
});
