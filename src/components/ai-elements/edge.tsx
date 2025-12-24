/**
 * Edge 组件（SolidJS 版本）
 * 用于显示边（需要 ReactFlow）
 * 
 * 注意：这是一个简化版本，不包含 ReactFlow 的完整功能
 * 如果需要完整功能，需要安装 @xyflow/react
 */

import { type Component, type JSX } from "solid-js";

export type EdgeProps = {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: string;
  targetPosition?: string;
  style?: JSX.CSSProperties;
};

export const Edge: Component<EdgeProps> = (props) => {
  const { sourceX, sourceY, targetX, targetY, style } = props;
  
  // 简化的贝塞尔曲线路径
  const midX = sourceX + (targetX - sourceX) * 0.5;
  const path = `M${sourceX},${sourceY} C ${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;

  return (
    <g>
      <path
        class="stroke-1 stroke-ring"
        d={path}
        fill="none"
        stroke="var(--color-ring)"
        stroke-width="1"
        style={{
          "stroke-dasharray": "5, 5",
          ...style,
        }}
      />
    </g>
  );
};

