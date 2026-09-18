import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, MIN_TOUCH_SIZE, radius, spacing } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Extra spoken description for screen readers. */
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Single accessible button primitive used by every screen (FR-037, FR-038). */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  style,
  testID,
}: AppButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text
        style={[styles.label, variant === 'primary' || variant === 'danger' ? styles.labelOnColor : null]}
        // Long Chinese labels stay readable when the user scales text (FR-040).
        maxFontSizeMultiplier={1.6}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  labelOnColor: {
    color: colors.onPrimary,
  },
});
