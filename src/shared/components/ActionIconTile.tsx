import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { colors } from '../theme';

/**
 * Motion Core icon tile (V1 pure-UI reskin, display only).
 *
 * Rounded teal tile behind a cyan action glyph, mirroring the visual
 * reference. Pure presentation — no press handling, no behaviour change.
 */
export function ActionIconTile({
  source,
  size = 48,
  style,
}: {
  source: ImageSourcePropType;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const glyph = Math.round(size * 0.72);
  return (
    <View
      accessible={false}
      style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.28) }, style]}
    >
      <Image
        source={source}
        style={{ width: glyph, height: glyph }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.iconTile,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
