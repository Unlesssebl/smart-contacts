import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "./utils"
import { Button } from "./button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

interface FilterComboboxProps {
  options: string[]
  value?: string
  onChange: (value: string | undefined) => void
  placeholder: string
  emptyText?: string
}

export function FilterCombobox({
  options,
  value,
  onChange,
  placeholder,
  emptyText = "Ничего не найдено.",
}: FilterComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between font-normal text-muted-foreground"
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Поиск..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => {
                  onChange(undefined)
                  setOpen(false)
                }}
                className="font-medium text-muted-foreground"
              >
                Очистить
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    // CommandItem converts value to lowercase internally for searching in some implementations, 
                    // but we need the exact casing. Actually, let's just use `option` directly in onChange to preserve case.
                    onChange(option === value ? undefined : option)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
