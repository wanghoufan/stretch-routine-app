import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './src/app/providers/AppProviders';
import { createAppServices, initializeApp } from './src/app/providers/createAppServices';
import { NavigationProvider } from './src/app/navigation/NavigationContext';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { colors, spacing } from './src/shared/theme';

/**
 * App entry: open the local database, apply migrations, seed the starter
 * library on a brand-new install, then render the stack.
 *
 * Boot never blocks on the network — V1 is local-only and offline by default
 * (Constitution II).
 */
export default function App() {
  const [services] = useState(() => createAppServices());
  const [boot, setBoot] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    initializeApp(services)
      .then(() => {
        if (!cancelled) {
          setBoot({ status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBoot({
            status: 'error',
            message: error instanceof Error ? error.message : '本地数据库初始化失败',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [services]);

  if (boot.status !== 'ready') {
    return (
      <View style={styles.boot}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.bootText} maxFontSizeMultiplier={1.5}>
          {boot.status === 'error' ? `本地数据库初始化失败：${boot.message ?? ''}` : '正在准备本地数据…'}
        </Text>
      </View>
    );
  }

  return (
    <AppProviders services={services}>
      <StatusBar style="dark" />
      <NavigationProvider>
        <AppNavigator />
      </NavigationProvider>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  bootText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
