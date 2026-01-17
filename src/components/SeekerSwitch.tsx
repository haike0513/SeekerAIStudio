import type { Component, JSX } from "solid-js";
import { splitProps } from "solid-js";
import * as SwitchPrimitive from "@ensolid/radix";
import { cn } from "@/lib/utils";

export interface SwitchProps extends SwitchPrimitive.SwitchProps {}

export const SeekerSwitch: Component<SwitchProps> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <SwitchPrimitive.Switch
      class={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        local.class
      )}
      {...others}
    >

    </SwitchPrimitive.Switch>
  );
};