import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {theme} from '../../core/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}

export function PrimaryButton({label, onPress, disabled, variant = 'primary'}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, variant === 'ghost' ? styles.ghost : styles.primary, disabled && styles.disabled]}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {paddingVertical: 14, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.md, alignItems: 'center'},
  primary: {backgroundColor: theme.colors.primary},
  ghost: {backgroundColor: theme.colors.surface},
  disabled: {opacity: 0.5},
  text: {color: theme.colors.text, fontSize: theme.font.body, fontWeight: '600'},
});
