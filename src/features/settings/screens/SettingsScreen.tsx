import { StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '../../../app/navigation/NavigationContext';
import { useSettings } from '../../../app/providers/SettingsContext';
import { Card, SectionTitle } from '../../../shared/components/Layout';
import { NoticeBanner } from '../../../shared/components/NoticeBanner';
import { Screen } from '../../../shared/components/Screen';
import { StepperField } from '../../../shared/components/Fields';
import { colors, fontSizes, spacing } from '../../../shared/theme';
import {
  COUNTDOWN_WARNING_MAX_SEC,
  COUNTDOWN_WARNING_MIN_SEC,
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  SPEECH_RATE_STEP,
} from '../settingsModel';
import { DURATION_MAX_SEC, DURATION_MIN_SEC, TRANSITION_MAX_SEC, TRANSITION_MIN_SEC } from '../../../domain/routine/constants';

/**
 * Settings (T083, SPEC US7).
 *
 * Only the values that change speech or timing defaults are configurable —
 * cosmetic personalisation is explicitly out of V1 scope.
 */
export function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, loading, update } = useSettings();

  return (
    <Screen title="设置" onBack={navigation.goBack}>
      {loading ? <NoticeBanner title="正在读取设置…" /> : null}

      <SectionTitle>语音</SectionTitle>
      <Card>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel} maxFontSizeMultiplier={1.5}>
            语音播报
          </Text>
          <Switch
            value={settings.ttsEnabled}
            onValueChange={(value) => {
              void update({ ttsEnabled: value });
            }}
            accessibilityLabel="语音播报开关"
            testID="settings-tts-enabled"
          />
        </View>
        <Text style={styles.hint} maxFontSizeMultiplier={1.5}>
          关闭后流程仍然按时间自动切换，只是不再朗读。
        </Text>

        <StepperField
          label="语速"
          value={settings.speechRate}
          onChange={(value) => {
            void update({ speechRate: value });
          }}
          min={SPEECH_RATE_MIN}
          max={SPEECH_RATE_MAX}
          step={SPEECH_RATE_STEP}
          formatValue={(value) => `${value.toFixed(1)}x`}
          testID="settings-speech-rate"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel} maxFontSizeMultiplier={1.5}>
            结束前倒计时提示
          </Text>
          <Switch
            value={settings.countdownWarningEnabled}
            onValueChange={(value) => {
              void update({ countdownWarningEnabled: value });
            }}
            accessibilityLabel="倒计时提示开关"
            testID="settings-countdown-enabled"
          />
        </View>
        <StepperField
          label="倒计时提示时长"
          value={settings.countdownWarningSec}
          onChange={(value) => {
            void update({ countdownWarningSec: value });
          }}
          min={COUNTDOWN_WARNING_MIN_SEC}
          max={COUNTDOWN_WARNING_MAX_SEC}
          step={1}
          testID="settings-countdown-sec"
        />
      </Card>

      <SectionTitle>新流程默认值</SectionTitle>
      <Card>
        <StepperField
          label="默认动作时长"
          value={settings.defaultDurationSec}
          onChange={(value) => {
            void update({ defaultDurationSec: value });
          }}
          min={DURATION_MIN_SEC}
          max={DURATION_MAX_SEC}
          step={5}
          testID="settings-default-duration"
        />
        <StepperField
          label="默认过渡时长"
          value={settings.defaultTransitionSec}
          onChange={(value) => {
            void update({ defaultTransitionSec: value });
          }}
          min={TRANSITION_MIN_SEC}
          max={TRANSITION_MAX_SEC}
          step={5}
          testID="settings-default-transition"
        />
        <Text style={styles.hint} maxFontSizeMultiplier={1.5}>
          只影响之后新建的流程，不会改动已经保存的流程。
        </Text>
      </Card>

      <SectionTitle>关于</SectionTitle>
      <Card>
        <Text style={styles.about} maxFontSizeMultiplier={1.5}>
          本应用完全离线运行，不需要注册、不联网、不含 AI 或支付功能。流程内容由你自己定义；本应用只负责按顺序提示与计时，不构成医学建议。
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.text,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
  about: {
    fontSize: fontSizes.meta,
    color: colors.textMuted,
    lineHeight: 21,
  },
});
