import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/constants/theme';

const SPECTRUM = [
  // Light
  '#FFCDD2','#FFE0B2','#FFF9C4','#DCEDC8','#B2EBF2','#BBDEFB','#E1BEE7','#F8BBD9',
  // Medium-light
  '#EF9A9A','#FFCC80','#FFF176','#A5D6A7','#80DEEA','#90CAF9','#CE93D8','#F48FB1',
  // Medium
  '#E57373','#FF8A65','#FFD54F','#66BB6A','#26C6DA','#42A5F5','#AB47BC','#F06292',
  // Medium-dark
  '#EF5350','#FF7043','#FFC107','#43A047','#00ACC1','#1E88E5','#8E24AA','#E91E63',
  // Dark
  '#C62828','#BF360C','#FF8F00','#1B5E20','#006064','#0D47A1','#4A148C','#880E4F',
  // Neutrals
  '#CFD8DC','#B0BEC5','#90A4AE','#78909C','#607D8B','#546E7A','#455A64','#37474F',
];

function isValidHex(s: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(s);
}

interface Props {
  color: string;
  onChange: (hex: string) => void;
}

export function ColorPicker({ color, onChange }: Props) {
  const [hex, setHex] = useState(color);

  const handleHexChange = (val: string) => {
    setHex(val);
    if (isValidHex(val)) onChange(val);
  };

  const pick = (c: string) => { onChange(c); setHex(c); };

  const previewColor = isValidHex(hex) ? hex : color;

  return (
    <View style={s.root}>
      <View style={s.inputRow}>
        <View style={[s.preview, { backgroundColor: previewColor }]} />
        <TextInput
          style={s.hexInput}
          value={hex}
          onChangeText={handleHexChange}
          placeholder="#RRGGBB"
          placeholderTextColor={C.textMuted}
          autoCapitalize="characters"
          maxLength={7}
          returnKeyType="done"
          onSubmitEditing={() => { if (isValidHex(hex)) onChange(hex); }}
        />
        {isValidHex(hex) && hex.toUpperCase() !== color.toUpperCase() && (
          <Pressable style={s.applyBtn} onPress={() => onChange(hex)}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </Pressable>
        )}
      </View>

      <View style={s.grid}>
        {SPECTRUM.map((c) => {
          const sel = previewColor.toUpperCase() === c.toUpperCase();
          return (
            <Pressable
              key={c}
              style={[s.swatch, { backgroundColor: c }, sel && s.swatchActive]}
              onPress={() => pick(c)}
            >
              {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preview: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  hexInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: C.textPrimary,
    letterSpacing: 1,
  },
  applyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  swatchActive: { borderWidth: 3, borderColor: '#fff' },
});
