/**
 * Connection 组件（SolidJS 版本）
 * 用于显示连接线（需要 ReactFlow）
 * 
 * 注意：这是一个简化版本，不包含 ReactFlow 的完整功能
 * 如果需要完整功能，需要安装 @xyflow/react
 */

import { type Component, type JSX } from "solid-js";

export type ConnectionProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

const HALF = 0.5;

export const Connection: Component<ConnectionProps> = (props) => {
  const { fromX, fromY, toX, toY } = props;
  const midX = fromX + (toX - fromX) * HALF;
  const midY = fromY + (toY - fromY) * HALF;
  const path = `M${fromX},${fromY} C ${midX},${fromY} ${midX},${toY} ${toX},${toY}`;

  return (
    <svg class="absolute inset-0 pointer-events-none">
      <g>
        <path
          class="animated"
          d={path}
          fill="none"
          stroke="var(--color-ring)"
          stroke-width="1"
        />
        <circle
          cx={toX}
          cy={toY}
          fill="#fff"
          r="3"
          stroke="var(--color-ring)"
          stroke-width="1"
        />
      </g>
    </svg>
  );
};

