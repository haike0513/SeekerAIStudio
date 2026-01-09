import { Component, createSignal } from "solid-js";
import { useNovelStore } from "../../stores/novelStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AddCharacterDialog: Component<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = (props) => {
  const { addCharacter } = useNovelStore();
  const [name, setName] = createSignal("");
  const [role, setRole] = createSignal<any>("supporting"); // simple string for select/radio
  const [bio, setBio] = createSignal("");
  const [traits, setTraits] = createSignal("");

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    addCharacter({
      name: name(),
      role: role(),
      bio: bio(),
      traits: traits().split(",").map((t) => t.trim()).filter(Boolean),
    });
    setName("");
    setBio("");
    setTraits("");
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Character</DialogTitle>
          <DialogDescription>
            Add a new character to your story bible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              class="col-span-3"
              required
            />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="role" class="text-right">
              Role
            </Label>
            <select
                id="role"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                value={role()}
                onChange={(e) => setRole(e.currentTarget.value)}
            >
                <option value="protagonist">Protagonist</option>
                <option value="antagonist">Antagonist</option>
                <option value="supporting">Supporting</option>
                <option value="other">Other</option>
            </select>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="traits" class="text-right">
              Traits
            </Label>
            <Input
              id="traits"
              value={traits()}
              onInput={(e) => setTraits(e.currentTarget.value)}
              placeholder="Brave, Smart, (comma separated)"
              class="col-span-3"
            />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="bio" class="text-right">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio()}
              onInput={(e) => setBio(e.currentTarget.value)}
              class="col-span-3 min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button type="submit">Save Character</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCharacterDialog;
