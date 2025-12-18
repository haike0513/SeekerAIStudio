/**
 * Shadcn-Solid 组件使用示例
 * 这个文件展示了如何使用已安装的 UI 组件
 */

import { Button } from "./button";
import { Input } from "./input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "./card";

export function ComponentExample() {
  return (
    <div class="p-8 space-y-4">
      <h1 class="text-2xl font-bold">Shadcn-Solid 组件示例</h1>

      {/* Button 示例 */}
      <Card>
        <CardHeader>
          <CardTitle>按钮组件</CardTitle>
          <CardDescription>不同变体和尺寸的按钮</CardDescription>
        </CardHeader>
        <CardContent class="space-x-2">
          <Button variant="default">默认</Button>
          <Button variant="destructive">危险</Button>
          <Button variant="outline">轮廓</Button>
          <Button variant="secondary">次要</Button>
          <Button variant="ghost">幽灵</Button>
          <Button variant="link">链接</Button>
        </CardContent>
        <CardContent class="space-x-2">
          <Button size="sm">小尺寸</Button>
          <Button size="default">默认尺寸</Button>
          <Button size="lg">大尺寸</Button>
        </CardContent>
      </Card>

      {/* Input 示例 */}
      <Card>
        <CardHeader>
          <CardTitle>输入框组件</CardTitle>
          <CardDescription>不同类型的输入框</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <Input type="text" placeholder="文本输入" />
          <Input type="email" placeholder="邮箱输入" />
          <Input type="password" placeholder="密码输入" />
        </CardContent>
      </Card>

      {/* Card 示例 */}
      <Card>
        <CardHeader>
          <CardTitle>卡片组件</CardTitle>
          <CardDescription>这是一个卡片组件的示例</CardDescription>
        </CardHeader>
        <CardContent>
          <p>这是卡片的内容区域，可以放置任何内容。</p>
        </CardContent>
        <CardFooter>
          <Button>操作按钮</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

