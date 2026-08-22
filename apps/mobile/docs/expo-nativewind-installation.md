# Installation with Expo of Nativewind

## 1. Install Nativewind

You will need to install nativewind and its peer dependencies tailwindcss, react-native-reanimated and react-native-safe-area-context.

**npm**
```bash
npm install nativewind react-native-reanimated react-native-safe-area-context
npm install --dev tailwindcss@^3.4.17 prettier-plugin-tailwindcss@^0.5.11 babel-preset-expo
```

**yarn** | **pnpm** | **bun** | **expo**

## 2. Setup Tailwind CSS

Run `npx tailwindcss init` to create a `tailwind.config.js` file

Add the paths to all of your component files in your `tailwind.config.js` file.

**tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Create a CSS file and add the Tailwind directives.

**global.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

> From here onwards, replace `./global.css` with the relative path to the CSS file you just created.

## 3. Add the Babel preset

**babel.config.js**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

## 4. Create or modify your metro.config.js

Create a `metro.config.js` file in the root of your project if you don't already have one, then add the following configuration:

**metro.config.js**
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)
 
module.exports = withNativeWind(config, { input: './global.css' })
```

## 5. Import your CSS file

**App.js**
```javascript
import "./global.css"
 
export default App() {
  /* Your App */
}
```

## 6. Modify your app.json

Switch the bundler to use the Metro bundler

```json
{
  "expo": {
    "web": {
      "bundler": "metro"
    }
  }
}
```

## 7. TypeScript setup (optional)

If you're using TypeScript in your project, you'll need to set up the type definitions. Nativewind extends the React Native types via declaration merging. The simplest method to include the types is to create a new `nativewind-env.d.ts` file and add a triple-slash directive referencing the types.

```typescript
/// <reference types="nativewind/types" />
```

> **CAUTION**
>
> Do not call this file:
> - `nativewind.d.ts`
> - The same name as a file or folder in the same directory (e.g `app.d.ts` when an `/app` folder exists)
> - The same name as a folder in node_modules (e.g `react.d.ts`)
>
> By doing so, your types will not be picked up by the TypeScript compiler.

## Try it out!

Create a simple component to test your Nativewind setup:

**App.tsx**
```tsx
import "./global.css"
import { Text, View } from "react-native";
 
export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-blue-500">
        Welcome to Nativewind!
      </Text>
    </View>
  );
}
```

This example shows:
- Using `className` prop to style components
- Tailwind utility classes like `flex-1`, `items-center`, `justify-center`
- Color utilities like `bg-white`, `text-blue-500`
- Typography utilities like `text-xl`, `font-bold`

**If you see the styled text centered on a white background, Nativewind is working correctly!**