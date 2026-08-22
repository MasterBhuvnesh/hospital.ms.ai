# Lucide Icons in React Native (Expo)

Lucide is a modern, open-source SVG icon library for React Native applications. Icons are lightweight, customizable, tree-shakeable, and easy to use.

## Installation

Install Lucide Icons:

```bash
npx expo install lucide-react-native
```

Lucide icons use SVGs under the hood, so ensure `react-native-svg` is installed:

```bash
npx expo install react-native-svg
```

Expo includes support for `react-native-svg`, making Lucide work seamlessly in Expo projects.

---

## Basic Usage

Import any icon directly from `lucide-react-native`:

```tsx
import { Home } from "lucide-react-native";

export default function App() {
  return <Home />;
}
```

---

## Customize Icons

All Lucide icons accept common props:

* `size`
* `color`
* `strokeWidth`

```tsx
import { Home } from "lucide-react-native";

export default function App() {
  return (
    <Home
      size={24}
      color="#ef4444"
      strokeWidth={2}
    />
  );
}
```

---

## Multiple Icons

```tsx
import {
  Home,
  Search,
  User,
  Settings,
} from "lucide-react-native";

export default function App() {
  return (
    <>
      <Home size={24} />
      <Search size={24} />
      <User size={24} />
      <Settings size={24} />
    </>
  );
}
```

---

## Using with Touchable Components

```tsx
import { TouchableOpacity } from "react-native";
import { Bell } from "lucide-react-native";

export default function NotificationButton() {
  return (
    <TouchableOpacity>
      <Bell size={22} />
    </TouchableOpacity>
  );
}
```

---

## Using with NativeWind

```tsx
import { Home } from "lucide-react-native";

export default function Example() {
  return (
    <Home
      className="text-red-500"
      size={24}
    />
  );
}
```

If `className` styling doesn't affect the icon color, use the `color` prop:

```tsx
<Home color="#ef4444" size={24} />
```

---

## Creating a Reusable Icon Component

```tsx
import { LucideIcon } from "lucide-react-native";

type IconProps = {
  icon: LucideIcon;
  size?: number;
  color?: string;
};

export function AppIcon({
  icon: Icon,
  size = 24,
  color = "#000",
}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
    />
  );
}
```

Usage:

```tsx
import { Home } from "lucide-react-native";
import { AppIcon } from "./AppIcon";

<AppIcon icon={Home} />;
```

---

## Common Example: Bottom Navigation

```tsx
import {
  House,
  Search,
  User,
} from "lucide-react-native";

<View className="flex-row justify-around py-4">
  <House size={24} />
  <Search size={24} />
  <User size={24} />
</View>
```

---

## Finding Icons

Browse all available icons:

* https://lucide.dev/icons

Lucide currently provides more than 1,700 icons and only bundles the icons you import, helping keep your app size smaller.

---

## Example

```tsx
import { Heart } from "lucide-react-native";

export default function App() {
  return (
    <Heart
      size={32}
      color="tomato"
      strokeWidth={2}
    />
  );
}
```

Result: ❤️ A customizable heart icon rendered as SVG.
