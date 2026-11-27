"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

const options = [
  {
    value: "light",
    label: "Light",
    description: "Bright background, easy in daylight.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dim background, easier on the eyes at night.",
    icon: Moon,
  },
] as const

type ThemeChoice = (typeof options)[number]["value"]

export function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const current: ThemeChoice = theme === "dark" ? "dark" : "light"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose the theme used across the app. Your choice is saved on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <RadioGroup
            value={current}
            onValueChange={(value) => setTheme(value as ThemeChoice)}
            aria-label="Theme"
            className="grid gap-3 sm:grid-cols-2"
          >
            {options.map(({ value, label, description, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={`theme-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
                  current === value
                    ? "border-primary bg-accent"
                    : "border-border",
                )}
              >
                <RadioGroupItem id={`theme-${value}`} value={value} />
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="text-[13px] font-normal text-muted-foreground">
                    {description}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  )
}
