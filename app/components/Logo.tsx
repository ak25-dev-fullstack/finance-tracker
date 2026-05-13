import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LogoProps {
  height?: number;
}

const DWK_COLOR = '#9580C8';
const FIN_COLOR = '#A893D4';

export default function Logo({ height = 32 }: LogoProps) {
  const dwkSize = height * 0.85;
  const finSize = height * 0.38;
  const sepHeight = height * 0.62;

  return (
    <View style={s.row}>
      <Text style={[s.dwk, { fontSize: dwkSize, color: DWK_COLOR }]}>DWK</Text>
      <View style={[s.sep, { height: sepHeight, backgroundColor: FIN_COLOR }]} />
      <Text style={[s.finance, { fontSize: finSize, color: FIN_COLOR }]}>FINANCE</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dwk: { fontWeight: '800', letterSpacing: -0.5 },
  sep: { width: 1.5, marginHorizontal: 2 },
  finance: { fontWeight: '300', letterSpacing: 2.5, marginTop: 2 },
});
