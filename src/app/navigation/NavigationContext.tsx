import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { BackHandler } from 'react-native';
import { HOME_ROUTE, type Route, type RouteName, type RouteParamsMap } from './routes';

export interface NavigationApi {
  /** Route currently on top of the stack. */
  route: Route;
  canGoBack: boolean;
  depth: number;
  navigate: <K extends RouteName>(name: K, params: RouteParamsMap[K]) => void;
  /** Replace the current route (used by Runner -> Completion). */
  replace: <K extends RouteName>(name: K, params: RouteParamsMap[K]) => void;
  goBack: () => void;
  /** Clear the stack down to a single route (used after finishing). */
  reset: <K extends RouteName>(name: K, params: RouteParamsMap[K]) => void;
}

const NavigationContext = createContext<NavigationApi | null>(null);

export function NavigationProvider({
  children,
  initialRoute = HOME_ROUTE,
}: {
  children: ReactNode;
  initialRoute?: Route;
}) {
  const [stack, setStack] = useState<Route[]>([initialRoute]);

  const navigate = useCallback(<K extends RouteName>(name: K, params: RouteParamsMap[K]) => {
    setStack((previous) => [...previous, { name, params } as Route]);
  }, []);

  const replace = useCallback(<K extends RouteName>(name: K, params: RouteParamsMap[K]) => {
    setStack((previous) => {
      const next = previous.length === 0 ? [] : previous.slice(0, -1);
      return [...next, { name, params } as Route];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous));
  }, []);

  const reset = useCallback(<K extends RouteName>(name: K, params: RouteParamsMap[K]) => {
    setStack([{ name, params } as Route]);
  }, []);

  // Android hardware back behaves like the in-app back button.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStack((previous) => {
        if (previous.length > 1) {
          return previous.slice(0, -1);
        }
        return previous;
      });
      return true;
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<NavigationApi>(
    () => ({
      route: stack[stack.length - 1] ?? HOME_ROUTE,
      canGoBack: stack.length > 1,
      depth: stack.length,
      navigate,
      replace,
      goBack,
      reset,
    }),
    [stack, navigate, replace, goBack, reset],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationApi {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error('useNavigation 必须在 NavigationProvider 内使用');
  }
  return value;
}

/**
 * Narrow a route to its typed params, e.g.
 * `const { routineId } = useRoute('RoutineDetail');`
 */
export function useRoute<K extends RouteName>(name: K): RouteParamsMap[K] {
  const { route } = useNavigation();
  if (route.name !== name) {
    throw new Error(`当前路由是 ${route.name}，不是 ${name}`);
  }
  return route.params as RouteParamsMap[K];
}
