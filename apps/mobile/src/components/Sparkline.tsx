import { useWindowDimensions, View, Text } from "react-native";
import Svg, { Polyline } from "react-native-svg";

export function Sparkline({ points, height = 60 }: { points: number[]; height?: number }) {
  const { width } = useWindowDimensions();
  const w = Math.max(120, width - 40 - 32);
  const pad = 6;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => ({
    x: pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1),
    y: pad + (1 - (p - min) / range) * (height - pad * 2),
  }));
  const path = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <View>
      <Svg width={w} height={height}>
        <Polyline
          points={path}
          fill="none"
          stroke="#208AEF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text className="absolute right-0 top-0 text-[10px] font-semibold text-zinc-400">{max}</Text>
      <Text className="absolute bottom-0 right-0 text-[10px] font-semibold text-zinc-400">{min}</Text>
    </View>
  );
}
