import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 兒童友善高對比配色
        sunny: '#FFC83D',
        grass: '#5BC236',
        sky: '#3DA5FF',
        coral: '#FF6B6B',
        cream: '#FFF8E7',
      },
      fontFamily: {
        kid: ['"Comic Sans MS"', '"Baloo 2"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        kid: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
