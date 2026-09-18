import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { TextField } from '../../../shared/components/Fields';
import { Card } from '../../../shared/components/Layout';
import { colors, spacing } from '../../../shared/theme';

/**
 * 快速输入 batch entry (T026, FR-004).
 *
 * The whole point of V1's creation flow: several actions typed at once instead
 * of one full form per action.
 */
export function BatchActionInput({ onAdd }: { onAdd: (input: string) => number }) {
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAdd = () => {
    const added = onAdd(value);
    if (added === 0) {
      setFeedback('没有可添加的内容，请每行输入一个动作');
      return;
    }
    setValue('');
    setFeedback(`已添加 ${added} 个动作`);
  };

  return (
    <Card>
      <Text style={styles.title} maxFontSizeMultiplier={1.5} accessibilityRole="header">
        快速输入
      </Text>
      <TextField
        label="每行一个动作"
        value={value}
        onChangeText={(text) => {
          setValue(text);
          if (feedback) {
            setFeedback(null);
          }
        }}
        placeholder={'肩部拉伸\n颈部拉伸\n胸部打开'}
        multiline
        numberOfLines={5}
        testID="batch-input"
        hint="空行会被忽略；顺序与输入顺序一致。"
      />
      <View style={styles.row}>
        <AppButton label="添加到流程" onPress={handleAdd} testID="batch-add" />
      </View>
      {feedback ? (
        <Text style={styles.feedback} testID="batch-feedback" maxFontSizeMultiplier={1.5}>
          {feedback}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  feedback: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textMuted,
  },
});
