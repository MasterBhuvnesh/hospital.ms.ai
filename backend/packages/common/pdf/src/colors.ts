import { rgb, RGB } from 'pdf-lib';

/** HMS brand colors for consistent PDF styling */
export const colors = {
  primary: rgb(0.07, 0.47, 0.87),       // #1278DE — blue
  primaryDark: rgb(0.04, 0.33, 0.63),    // #0A54A1
  secondary: rgb(0.18, 0.8, 0.58),       // #2ECC94 — green
  black: rgb(0, 0, 0),
  darkGray: rgb(0.2, 0.2, 0.2),          // #333333
  gray: rgb(0.4, 0.4, 0.4),             // #666666
  lightGray: rgb(0.75, 0.75, 0.75),      // #BFBFBF
  tableHeader: rgb(0.93, 0.95, 0.98),    // #EDF2FA — light blue bg
  tableBorder: rgb(0.82, 0.85, 0.89),    // #D1D9E3
  white: rgb(1, 1, 1),
  danger: rgb(0.91, 0.3, 0.24),          // #E84D3D — red
  warning: rgb(0.95, 0.77, 0.06),        // #F2C40A — yellow
} as const satisfies Record<string, RGB>;
