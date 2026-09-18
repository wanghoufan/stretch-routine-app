import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, MIN_TOUCH_SIZE, radius, spacing } from '../theme';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  testID,
  hint,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  testID?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        autoFocus={autoFocus}
        accessibilityLabel={label}
        accessibilityHint={hint}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        maxFontSizeMultiplier={1.5}
      />
      {hint ? (
        <Text style={styles.hint} maxFontSizeMultiplier={1.5}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function StepperField({
  label,
  value,
  onChange,
  min,
  max,
  step = 5,
  unit = '秒',
  testID,
  style,
  formatValue,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Override how the value is rendered, e.g. `1.2x` instead of `1.2`. */
  formatValue?: (value: number) => string;
}) {
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => onChange(Math.min(max, value + step));
  const display = formatValue ? formatValue(value) : `${value}${unit}`;

  return (
    <View style={[styles.stepperRow, style]} testID={testID}>
      <Text style={styles.stepperLabel} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
      <View style={styles.stepperControls}>
        <Pressable
          testID={testID ? `${testID}-minus` : undefined}
          onPress={decrease}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`${label}减少${step}${unit}`}
          accessibilityState={{ disabled: value <= min }}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed ? styles.stepperPressed : null,
            value <= min ? styles.stepperDisabled : null,
          ]}
        >
          <Text style={styles.stepperButtonText} maxFontSizeMultiplier={1.4}>
            减
          </Text>
        </Pressable>
        <Text
          testID={testID ? `${testID}-value` : undefined}
          style={styles.stepperValue}
          maxFontSizeMultiplier={1.5}
          accessibilityLabel={`${label}${display}`}
        >
          {display}
        </Text>
        <Pressable
          testID={testID ? `${testID}-plus` : undefined}
          onPress={increase}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={`${label}增加${step}${unit}`}
          accessibilityState={{ disabled: value >= max }}
          style={({ pressed }) => [
            styles.stepperButton,
            pressed ? styles.stepperPressed : null,
            value >= max ? styles.stepperDisabled : null,
          ]}
        >
          <Text style={styles.stepperButtonText} maxFontSizeMultiplier={1.4}>
            加
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: MIN_TOUCH_SIZE,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textMuted,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  stepperLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressed: {
    backgroundColor: colors.accentSoft,
  },
  stepperDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  stepperValue: {
    minWidth: 72,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
