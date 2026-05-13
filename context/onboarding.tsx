import { C } from '@/constants/theme';
import { loadOnboardingSeen, saveOnboardingSeen } from '@/services/storage';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';

type Rect = { x: number; y: number; width: number; height: number };

type OnboardingStep = {
  key: string;
  route: string;
  title: string;
  description: string;
  defaultHighlight?: Rect;
  tabBarIndex?: number;
};

interface OnboardingContextValue {
  activeStepKey: string | null;
  stepIndex: number;
  stepCount: number;
  showOnboarding: boolean;
  highlightRect: Rect | null;
  fixHighlight: (rect: Rect) => void;
  nextStep: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  stepTitle: string;
  stepDescription: string;
  activeStepTabBarIndex: number | null;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ steps, children }: { steps: OnboardingStep[]; children: React.ReactNode }) {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const window = Dimensions.get('window');

  const step = steps[stepIndex] || null;
  const activeStepKey = step?.key ?? null;
  const activeStepTabBarIndex = step?.tabBarIndex ?? null;

  useEffect(() => {
    let active = true;
    loadOnboardingSeen().then((seen) => {
      if (!active) return;
      if (!seen) {
        setShowOnboarding(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!showOnboarding || !step) return;
    setHighlightRect(step.defaultHighlight ?? null);
    router.replace(step.route as any);
  }, [showOnboarding, step, router]);

  const skipOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    setStepIndex(0);
    setHighlightRect(null);
    try {
      await saveOnboardingSeen();
    } catch {
      // ignore
    }
  }, []);

  const nextStep = useCallback(async () => {
    if (stepIndex + 1 >= steps.length) {
      await skipOnboarding();
      return;
    }
    const nextIndex = stepIndex + 1;
    const nextStep = steps[nextIndex];

    setStepIndex(nextIndex);
    setHighlightRect(nextStep?.defaultHighlight ?? null);
  }, [skipOnboarding, stepIndex, steps]);

  const fixHighlight = useCallback((rect: Rect) => {
    setHighlightRect((current) => {
      if (!current) return rect;
      const delta = Math.abs(current.x - rect.x) + Math.abs(current.y - rect.y) + Math.abs(current.width - rect.width) + Math.abs(current.height - rect.height);
      if (delta <= 16) {
        return current;
      }
      return rect;
    });
  }, []);

  const computedHighlight = useMemo<Rect | null>(() => {
    if (highlightRect) return highlightRect;
    if (step?.tabBarIndex !== undefined && step?.tabBarIndex !== null) {
      const count = 5;
      const tabWidth = window.width / count;
      const width = Math.min(108, tabWidth - 12);
      const x = Math.max(8, step.tabBarIndex * tabWidth + (tabWidth - width) / 2);
      const height = 54;
      const y = window.height - 72;
      return { x, y, width, height };
    }
    return step?.defaultHighlight ?? null;
  }, [highlightRect, step, window.width, window.height]);

  const stepTitle = step?.title ?? '';
  const stepDescription = step?.description ?? '';

  const tooltipPosition = useMemo(() => {
    if (!computedHighlight) {
      return { left: 16, right: 16, bottom: 28, width: Math.min(320, window.width - 32) };
    }

    const width = Math.min(280, window.width - 32);
    const centerX = computedHighlight.x + computedHighlight.width / 2 - width / 2;
    const left = Math.max(16, Math.min(window.width - width - 16, centerX));
    const placeAbove = computedHighlight.y > window.height * 0.45 || computedHighlight.y + computedHighlight.height > window.height * 0.7;

    if (placeAbove) {
      return {
        left,
        width,
        top: Math.max(16, computedHighlight.y - 170),
      };
    }

    return {
      left,
      width,
      top: Math.min(window.height - 170 - 16, computedHighlight.y + computedHighlight.height + 12),
    };
  }, [computedHighlight, window.height, window.width]);

  return (
    <OnboardingContext.Provider
      value={{
        activeStepKey,
        stepIndex,
        stepCount: steps.length,
        showOnboarding,
        highlightRect: computedHighlight,
        fixHighlight,
        nextStep,
        skipOnboarding,
        stepTitle,
        stepDescription,
        activeStepTabBarIndex,
      }}
    >
      {children}
      {showOnboarding && step && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          pointerEvents="box-none"
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.55)',
            }}
          />
          {computedHighlight && (
            <View
              style={{
                position: 'absolute',
                left: computedHighlight.x - 8,
                top: computedHighlight.y - 8,
                width: computedHighlight.width + 16,
                height: computedHighlight.height + 16,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: C.brandLight,
                backgroundColor: 'transparent',
              }}
            />
          )}
          <View
            style={[
              {
                position: 'absolute',
                backgroundColor: C.card,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: C.border,
                padding: 18,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 9,
              },
              tooltipPosition,
            ]}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 6 }}>{stepTitle}</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 20 }}>{stepDescription}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
              <Pressable
                onPress={skipOnboarding}
                style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: C.textMuted, fontWeight: '700' }}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={nextStep}
                style={{ flex: 1, backgroundColor: C.brand, borderRadius: 14, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{stepIndex + 1 >= steps.length ? 'Finish' : 'Continue'}</Text>
              </Pressable>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 10 }}>{stepIndex + 1} / {steps.length}</Text>
          </View>
        </View>
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}

export function useOnboardingTarget(stepKey: string) {
  const { activeStepKey, showOnboarding, fixHighlight } = useOnboarding();
  const targetRef = useRef<View>(null);

  useEffect(() => {
    if (!showOnboarding || activeStepKey !== stepKey || !targetRef.current) return;
    let active = true;
    const measureTarget = () => {
      const screenHeight = Dimensions.get('window').height;
      targetRef.current?.measureInWindow((x, y, width, height) => {
        if (!active) return;
        if (width > 0 && height > 0 && y >= 0 && y + height <= screenHeight) {
          fixHighlight({ x, y, width, height });
        }
      });
    };

    const raf = requestAnimationFrame(measureTarget);
    const timer = setTimeout(measureTarget, 120);
    const followUp = setTimeout(measureTarget, 260);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(followUp);
    };
  }, [activeStepKey, fixHighlight, showOnboarding, stepKey]);

  return targetRef;
}
