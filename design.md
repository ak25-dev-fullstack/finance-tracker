---
name: Fintech Mobile Design System
colors:
  surface: '#0F172A'
  surface-dim: '#0f1413'
  surface-bright: '#353a39'
  surface-container-lowest: '#0a0f0e'
  surface-container-low: '#171d1c'
  surface-container: '#1b2120'
  surface-container-high: '#262b2a'
  surface-container-highest: '#303635'
  on-surface: '#dee4e1'
  on-surface-variant: '#bcc9c6'
  inverse-surface: '#dee4e1'
  inverse-on-surface: '#2c3130'
  outline: '#879391'
  outline-variant: '#3d4947'
  surface-tint: '#6bd8cb'
  primary: '#6bd8cb'
  on-primary: '#003732'
  primary-container: '#29a195'
  on-primary-container: '#00302b'
  inverse-primary: '#006a61'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#ffb59a'
  on-tertiary: '#591c02'
  tertiary-container: '#d27956'
  on-tertiary-container: '#4f1700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#773215'
  background: '#0f1413'
  on-background: '#dee4e1'
  surface-variant: '#303635'
  surface-elevated: '#1E293B'
  text-primary: '#F8FAFC'
  text-secondary: '#94A3B8'
  gain: '#22C55E'
  loss: '#EF4444'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin-mobile: 16px
  container-margin-desktop: 24px
  gutter: 16px
---

# Design System — Fintech

## Overview
Financial app focused on precision, security, and trust.

## Colors
- **Primary** (#0D9488): Main actions, active states.
- **Surface** (#0F172A): Dark background (Surface).
- **Surface-Elevated** (#1E293B): Cards, elevated elements.
- **Text-Primary** (#F8FAFC): Headlines and primary text.
- **Text-Secondary** (#94A3B8): Subtitles and helper text.
- **Gain** (#22C55E): Positive values, income.
- **Loss** (#EF4444): Negative values, expenses.

## Typography
- **Headlines**: Inter, 600 (SemiBold), 20-28px
- **Body**: Inter, 400 (Regular), 16px
- **Numbers**: JetBrains Mono, 500 (Medium), 18px (Monospaced for table alignment)

## Components
- **Buttons**: Rounded corners (12px), solid fill for primary.
- **Cards**: Soft drop shadow, 16px border radius, background: `Surface-Elevated`.
- **Icons**: Outline style, 24x24px.
