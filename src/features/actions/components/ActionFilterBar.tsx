import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, MIN_TOUCH_SIZE, radius, spacing } from '../../../shared/theme';
import { DIFFICULTY_FILTERS, type DifficultyFilter } from '../services/actionGroups';

/**
 * Action library top filter bar (TASK-014, B-3).
 *
 * A single-choice difficulty chip row plus a name search box. Both are plain
 * controlled inputs: the screen owns the filter state so it can combine them
 * with the grouping rules.
 */
export function ActionFilterBar({
  difficulty,
  query,
  onDifficultyChange,
  onQueryChange,
}: {
  difficulty: DifficultyFilter;
  query: string;
  onDifficultyChange: (next: DifficultyFilter) => void;
  onQueryChange: (next: string) => void;
}) {
  return (
    <View style={styles.container}>
      <TextInput
        testID="library-search"
        accessibilityLabel="搜索动作名称"
        accessibilityHint="输入名称关键词过滤动作"
        placeholder="搜索动作名称"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={onQueryChange}
        style={styles.search}
        maxFontSizeMultiplier={1.5}
      />

      <View
        style={styles.chips}
        testID="library-filter-chips"
        accessibilityRole="radiogroup"
        accessibilityLabel="按难度筛选"
      >
        {DIFFICULTY_FILTERS.map((option) => {
          const selected = option === difficulty;
          return (
            <Pressable
              key={option}
              testID={`filter-difficulty-${option}`}
              onPress={() => onDifficultyChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option === '全部' ? '难度全部' : `难度${option}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  search: {
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    minHeight: 36,
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
