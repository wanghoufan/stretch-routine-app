import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RoutineStepDraft } from '../../../domain/routine/RoutineStep';
import {
  DURATION_MAX_SEC,
  DURATION_MIN_SEC,
  STEP_NAME_MAX_LENGTH,
  TRANSITION_MAX_SEC,
  TRANSITION_MIN_SEC,
} from '../../../domain/routine/constants';
import { AppButton } from '../../../shared/components/AppButton';
import { StepperField, TextField } from '../../../shared/components/Fields';
import { colors, fontSizes, spacing } from '../../../shared/theme';

/**
 * Per-step editor (T029) plus the bilateral "edit one side / edit both sides"
 * behaviour (T071, SPEC US4 scenarios 2 and 3).
 */

export interface StepEditValues {
  displayName: string;
  speakText: string;
  durationSec: number;
  transitionSec: number;
}

export function StepEditor({
  step,
  pairMateName,
  onClose,
  onSubmit,
}: {
  /** `null` closes the editor. */
  step: RoutineStepDraft | null;
  /** Present when this step is one side of a bilateral pair. */
  pairMateName?: string;
  onClose: () => void;
  onSubmit: (values: StepEditValues, scope: 'single' | 'pair') => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [speakText, setSpeakText] = useState('');
  const [durationSec, setDurationSec] = useState(DURATION_MIN_SEC);
  const [transitionSec, setTransitionSec] = useState(TRANSITION_MIN_SEC);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!step) {
      return;
    }
    setDisplayName(step.displayName);
    setSpeakText(step.speakText);
    setDurationSec(step.durationSec);
    setTransitionSec(step.transitionSec);
    setError(null);
  }, [step]);

  if (!step) {
    return null;
  }

  const isPaired = Boolean(step.pairGroupId) && step.side !== 'none';

  const submit = (scope: 'single' | 'pair') => {
    if (displayName.trim().length === 0) {
      setError('动作名称不能为空');
      return;
    }
    onSubmit(
      {
        displayName: displayName.trim().slice(0, STEP_NAME_MAX_LENGTH),
        speakText: (speakText.trim() || displayName.trim()).slice(0, STEP_NAME_MAX_LENGTH),
        durationSec,
        transitionSec,
      },
      scope,
    );
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title} maxFontSizeMultiplier={1.4} accessibilityRole="header">
              编辑动作
            </Text>

            {isPaired ? (
              <Text style={styles.pairHint} maxFontSizeMultiplier={1.5}>
                {`这是左右配对动作，另一侧是「${pairMateName ?? ''}」。只改这一侧会保留差异；两侧一起改会同步时长。`}
              </Text>
            ) : null}

            <TextField
              label="显示名称"
              value={displayName}
              onChangeText={setDisplayName}
              testID="step-editor-name"
            />
            <TextField
              label="朗读文本"
              value={speakText}
              onChangeText={setSpeakText}
              hint="留空则朗读显示名称。"
              testID="step-editor-speak"
            />
            <StepperField
              label="本动作时长"
              value={durationSec}
              onChange={setDurationSec}
              min={DURATION_MIN_SEC}
              max={DURATION_MAX_SEC}
              step={5}
              testID="step-editor-duration"
            />
            <StepperField
              label="过渡时长"
              value={transitionSec}
              onChange={setTransitionSec}
              min={TRANSITION_MIN_SEC}
              max={TRANSITION_MAX_SEC}
              step={5}
              testID="step-editor-transition"
            />

            {error ? (
              <Text style={styles.error} maxFontSizeMultiplier={1.5}>
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <AppButton label="取消" variant="secondary" onPress={onClose} />
              <AppButton
                label="只保存这一侧"
                onPress={() => submit('single')}
                testID="step-editor-save-single"
              />
            </View>
            {isPaired ? (
              <View style={styles.actions}>
                <AppButton
                  label="两侧一起改（时长与过渡）"
                  variant="secondary"
                  onPress={() => submit('pair')}
                  testID="step-editor-save-pair"
                />
              </View>
            ) : null}
          </ScrollView>
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
    maxHeight: '90%',
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  pairHint: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
});
