import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../theme';
import { AppButton } from './AppButton';

/** Standard screen scaffold: background, gutter, optional scroll content. */
export function ScreenBody({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.body, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.5}>
        {title}
      </Text>
      <Text style={styles.emptyDescription} maxFontSizeMultiplier={1.5}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.section,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSizes.section,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: spacing.lg,
  },
});
