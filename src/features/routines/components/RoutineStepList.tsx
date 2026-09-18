import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoutineStepDraft } from '../../../domain/routine/RoutineStep';
import { formatDuration } from '../../../shared/utils/format';
import { colors, radius, spacing } from '../../../shared/theme';
import { Card, SectionTitle } from '../../../shared/components/Layout';
import { StepActions } from './StepActions';

/**
 * Editable draft step list with reorder (T028, T030).
 *
 * Reordering uses explicit 上移/下移 buttons: the Constitution allows
 * "drag-and-drop or equivalent reordering", and buttons stay usable with a
 * screen reader and with large text.
 */

export interface RoutineStepListProps {
  steps: readonly RoutineStepDraft[];
  onEdit: (stepId: string) => void;
  onMove: (stepId: string, direction: -1 | 1) => void;
  onDuplicate: (stepId: string) => void;
  onDelete: (stepId: string) => void;
}

function sideLabel(side: RoutineStepDraft['side']): string | null {
  if (side === 'left') {
    return '左侧';
  }
  if (side === 'right') {
    return '右侧';
  }
  return null;
}

export function RoutineStepList({
  steps,
  onEdit,
  onMove,
  onDuplicate,
  onDelete,
}: RoutineStepListProps) {
  if (steps.length === 0) {
    return (
      <Card>
        <Text style={styles.empty} maxFontSizeMultiplier={1.5}>
          还没有动作。可以在上面快速输入，或从动作库添加。
        </Text>
      </Card>
    );
  }

  return (
    <View>
      <SectionTitle>{`动作顺序（共 ${steps.length} 个）`}</SectionTitle>
      {steps.map((step, index) => {
        const side = sideLabel(step.side);
        const meta = `${formatDuration(step.durationSec)} · 过渡 ${formatDuration(step.transitionSec)}`;
        return (
          <Card key={step.id}>
            <Pressable
              testID={`step-row-${index + 1}`}
              onPress={() => onEdit(step.id)}
              accessibilityRole="button"
              accessibilityLabel={`编辑第 ${index + 1} 个动作 ${step.displayName}`}
              accessibilityHint="打开动作编辑"
            >
              <View style={styles.headerRow}>
                <Text style={styles.index} maxFontSizeMultiplier={1.5}>
                  {`${index + 1}`}
                </Text>
                <View style={styles.titleArea}>
                  <Text style={styles.name} maxFontSizeMultiplier={1.5}>
                    {step.displayName}
                  </Text>
                  <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
                    {side ? `${side} · ${meta}` : meta}
                  </Text>
                  {step.speakText && step.speakText !== step.displayName ? (
                    <Text style={styles.meta} maxFontSizeMultiplier={1.5}>
                      {`朗读：${step.speakText}`}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
            <StepActions
              stepName={step.displayName}
              index={index + 1}
              canMoveUp={index > 0}
              canMoveDown={index < steps.length - 1}
              onMoveUp={() => onMove(step.id, -1)}
              onMoveDown={() => onMove(step.id, 1)}
              onDuplicate={() => onDuplicate(step.id)}
              onDelete={() => onDelete(step.id)}
            />
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  titleArea: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
});
