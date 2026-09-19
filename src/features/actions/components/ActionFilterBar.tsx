import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, MIN_TOUCH_SIZE, radius, spacing } from '../../../shared/theme';
import type { ActionScene, BodyPartChip, BodyPartFilter } from '../services/actionGroups';

/**
 * Action library top filter bar (TASK-014 B-3, TASK-018 B-4).
 *
 * A name search box plus single-choice body-part chips for the active scene
 * (HD-1=A). Both are plain controlled inputs: the screen owns the state so it
 * can combine the global search with the active-scene body-part pick.
 */
export function ActionFilterBar({
  query,
  onQueryChange,
  activeScene,
  activeSceneEmpty,
  bodyPart,
  bodyPartChips,
  onBodyPartChange,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  activeScene: ActionScene;
  /** True when the active scene currently has no matching card on screen. */
  activeSceneEmpty: boolean;
  bodyPart: BodyPartFilter;
  bodyPartChips: readonly BodyPartChip[];
  onBodyPartChange: (next: BodyPartFilter) => void;
}) {
  return (
    <View style={styles.container}>
      <TextInput
        testID="library-search"
        accessibilityLabel="搜索动作名称"
        accessibilityHint="输入名称关键词过滤所有场景的动作"
        placeholder="搜索动作名称"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={onQueryChange}
        style={styles.search}
        maxFontSizeMultiplier={1.5}
      />

      <View
        style={styles.chips}
        testID={`library-bodypart-chips-${activeScene}`}
        accessibilityRole="radiogroup"
        accessibilityLabel={`筛选${activeScene}部位`}
      >
        <Text style={styles.chipsSceneLabel} maxFontSizeMultiplier={1.5}>
          {`${activeScene}部位${activeSceneEmpty ? '（当前无匹配）' : ''}`}
        </Text>
        {bodyPartChips.map((chip) => {
          const selected = chip.key === bodyPart;
          return (
            <Pressable
              key={chip.key}
              testID={`filter-bodypart-${chip.key}`}
              onPress={() => onBodyPartChange(chip.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${activeScene}部位：${chip.key}`}
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
                {chip.key}
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
  chipsSceneLabel: {
    width: '100%',
    fontSize: 13,
    color: colors.textMuted,
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
