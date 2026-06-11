import type { ReactElement } from 'react';

import { Circle, G, Path, Rect, Svg } from '@react-pdf/renderer';

type IconProps = { color: string; size?: number };

function StrokeIcon({
  size = 9,
  color,
  children,
}: { size?: number; color: string; children: ReactElement | ReactElement[] }) {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24'>
      <G stroke={color} strokeWidth={1.8} fill='none'>
        {children}
      </G>
    </Svg>
  );
}

export function MapPinIcon({ color, size }: IconProps) {
  return (
    <StrokeIcon color={color} size={size}>
      <Path d='M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' />
      <Circle cx={12} cy={10} r={3} />
    </StrokeIcon>
  );
}

export function MailIcon({ color, size }: IconProps) {
  return (
    <StrokeIcon color={color} size={size}>
      <Rect x={2} y={4} width={20} height={16} rx={2} />
      <Path d='M2 7l10 6 10-6' />
    </StrokeIcon>
  );
}

export function PhoneIcon({ color, size }: IconProps) {
  return (
    <StrokeIcon color={color} size={size}>
      <Path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' />
    </StrokeIcon>
  );
}

export function LinkedInIcon({ color, size }: IconProps) {
  return (
    <StrokeIcon color={color} size={size}>
      <Path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V9h4v2' />
      <Rect x={2} y={9} width={4} height={12} />
      <Circle cx={4} cy={4} r={2} />
    </StrokeIcon>
  );
}

export function GithubIcon({ color, size }: IconProps) {
  return (
    <StrokeIcon color={color} size={size}>
      <Path d='M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22' />
    </StrokeIcon>
  );
}

export function GlobeIcon({ color, size }: IconProps) {
  return (
    <StrokeIcon color={color} size={size}>
      <Circle cx={12} cy={12} r={10} />
      <Path d='M2 12h20' />
      <Path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' />
    </StrokeIcon>
  );
}
