import { Input } from "@/components/ui/input"

export function MonthInput(props: Omit<React.ComponentProps<typeof Input>, "type">) {
  return <Input type="month" {...props} />
}
