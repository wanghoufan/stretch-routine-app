import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DURATION_MAX_SEC, DURATION_MIN_SEC, TRANSITION_MAX_SEC, TRANSITION_MIN_SEC } from '../../../domain/routine/constants';
import { StepperField, TextField } from '../../../shared/components/Fields';
import { Card } from '../../../shared/components/Layout';
import { colors, MIN_TOUCH_SIZE, radius, spacing } from '../../../shared/theme';
import {
  categoryForGroupChoice,
  groupChoiceForCategory,
  ROUTINE_GROUP_CHOICES,
} from '../services/routineGroups';

/**
 * Routine name + the two defaults that new steps inherit (T025, FR-002/005/006).
 */
export function RoutineFormHeader({
  name,
  defaultDurationSec,
  defaultTransitionSec,
  category,
  onChangeName,
  onChangeDefaultDuration,
  onChangeDefaultTransition,
  onChangeCategory,
}: {
  name: string;
  defaultDurationSec: number;
  defaultTransitionSec: number;
  category: readonly string[];
  onChangeName: (name: string) => void;
  onChangeDefaultDuration: (seconds: number) => void;
  onChangeDefaultTransition: (seconds: number) => void;
  onChangeCategory: (category: string[]) => void;
}) {
  const choice = groupChoiceForCategory(category);
  const [customDraft, setCustomDraft] = useState(
    choice === null ? (category[0] ?? '') : '',
  );

  const pickChoice = (next: (typeof ROUTINE_GROUP_CHOICES)[number]) => {
    setCustomDraft('');
    onChangeCategory([categoryForGroupChoice(next)]);
  };

  const changeCustom = (text: string) => {
    setCustomDraft(text);
    const trimmed = text.trim();
    onChangeCategory(trimmed.length > 0 ? [trimmed] : []);
  };

  return (
    <Card>
      <TextField
        label="流程名称"
        value={name}
        onChangeText={onChangeName}
        placeholder="例如：肩颈放松"
        testID="routine-name-input"
      />
      <View style={styles.groupSection}>
        <Text style={styles.groupLabel} maxFontSizeMultiplier={1.5}>
          所属分组（首页按此归类，可自定）
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="选择流程分组">
          {ROUTINE_GROUP_CHOICES.map((option) => {
            const selected = choice === option;
            return (
              <Pressable
                key={option}
                testID={`routine-group-${option}`}
                onPress={() => pickChoice(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`分组：${option}`}
                style={({ pressed }) => [
                  styles.chip,
                  selected ? styles.chipSelected : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text
                  style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}
                  maxFontSizeMultiplier={1.4}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="自定义分组名（可选，填了就用它自成一组）"
          value={customDraft}
          onChangeText={changeCustom}
          placeholder="例如：睡前放松"
          testID="routine-group-custom"
        />
      </View>
      <View style={styles.defaults}>
        <StepperField
          label="默认每个动作时长"
          value={defaultDurationSec}
          onChange={onChangeDefaultDuration}
          min={DURATION_MIN_SEC}
          max={DURATION_MAX_SEC}
          step={5}
          testID="routine-default-duration"
        />
        <StepperField
          label="默认过渡时长"
          value={defaultTransitionSec}
          onChange={onChangeDefaultTransition}
          min={TRANSITION_MIN_SEC}
          max={TRANSITION_MAX_SEC}
          step={5}
          testID="routine-default-transition"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  defaults: {
    marginTop: spacing.sm,
  },
  groupSection: {
    marginTop: spacing.sm,
  },
  groupLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipLabelSelected: {
    color: colors.primary,
  },
});
