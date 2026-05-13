import { C } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LogoProps {
  width?: number;
  height?: number;
}

export default function Logo({ height = 28 }: LogoProps) {
  return (
    <View style={[s.container, { height }]}>
      <Text style={[s.dwk, { fontSize: height * 0.6 }]}>DWK</Text>
      <Text style={[s.finance, { fontSize: height * 0.45 }]}>Finance</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  dwk: { fontWeight: '800', color: C.brandLight, letterSpacing: 0.5 },
  finance: { fontWeight: '500', color: C.textSecondary, letterSpacing: 0.3 },
});
