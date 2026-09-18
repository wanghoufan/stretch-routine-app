import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Action, ActionSideMode } from '../../../domain/action/Action';
import {
  DURATION_MAX_SEC,
  DURATION_MIN_SEC,
  ROUTINE_NAME_MAX_LENGTH,
} from '../../../domain/routine/constants';
import { AppButton } from '../../../shared/components/AppButton';
import { StepperField, TextField } from '../../../shared/components/Fields';
import { colors, fontSizes, spacing } from '../../../shared/theme';

/**
 * Create / edit a reusable Action (T075) including the single vs bilateral
 * selector (T069, SPEC US6).
 */
export interface ActionEditorValues {
  name: string;
  defaultDurationSec: number;
  sideMode: ActionSideMode;
  defaultSpeakText?: string;
}

export function ActionEditor({
  visible,
  action,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  /** `null` = creating a new action. */
  action: Action | null;
  onClose: () => void;
  onSubmit: (values: ActionEditorValues) => void;
}) {
  const [name, setName] = useState('');
  const [durationSec, setDurationSec] = useState(DURATION_MIN_SEC);
  const [sideMode, setSideMode] = useState<ActionSideMode>('single');
  const [speakText, setSpeakText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setName(action?.name ?? '');
    setDurationSec(action?.defaultDurationSec ?? 30);
    setSideMode(action?.sideMode ?? 'single');
    setSpeakText(action?.defaultSpeakText ?? '');
    setError(null);
  }, [visible, action]);

  const submit = () => {
    if (name.trim().length === 0) {
      setError('请填写动作名称');
      return;
    }
    onSubmit({
      name: name.trim().slice(0, ROUTINE_NAME_MAX_LENGTH),
      defaultDurationSec: durationSec,
      sideMode,
      defaultSpeakText: speakText.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title} maxFontSizeMultiplier={1.4} accessibilityRole="header">
              {action ? '编辑动作' : '新建动作'}
            </Text>
            <TextField
              label="动作名称"
              value={name}
              onChangeText={setName}
              placeholder="例如：肩部拉伸"
              testID="action-editor-name"
            />
            <StepperField
              label="默认时长"
              value={durationSec}
              onChange={setDurationSec}
              min={DURATION_MIN_SEC}
              max={DURATION_MAX_SEC}
              step={5}
              testID="action-editor-duration"
            />
            <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.5}>
              动作类型
            </Text>
            <View style={styles.row}>
              <AppButton
                label={sideMode === 'single' ? '已选 · 单侧' : '单侧'}
                variant={sideMode === 'single' ? 'primary' : 'secondary'}
                onPress={() => setSideMode('single')}
                testID="action-editor-single"
              />
              <AppButton
                label={sideMode === 'bilateral' ? '已选 · 左右配对' : '左右配对'}
                variant={sideMode === 'bilateral' ? 'primary' : 'secondary'}
                onPress={() => setSideMode('bilateral')}
                testID="action-editor-bilateral"
              />
            </View>
            <Text style={styles.hint} maxFontSizeMultiplier={1.5}>
              左右配对的动作加入流程时会自动生成左侧、右侧两个动作。
            </Text>
            <TextField
              label="默认朗读文本（可选）"
              value={speakText}
              onChangeText={setSpeakText}
              hint="留空则朗读动作名称。"
              testID="action-editor-speak"
            />
            {error ? (
              <Text style={styles.error} maxFontSizeMultiplier={1.5}>
                {error}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <AppButton label="取消" variant="secondary" onPress={onClose} />
              <AppButton label="保存" onPress={submit} testID="action-editor-save" />
            </View>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
});
