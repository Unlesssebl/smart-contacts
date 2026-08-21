import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

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
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "group relative w-full justify-start border border-slate-200 bg-white pr-10 font-normal text-slate-600 shadow-sm transition-[border-color,box-shadow,background-color,color] duration-200 hover:bg-slate-100",
              value && "pr-[4.5rem]",
              open && "border-[#668aab] bg-white text-slate-900 shadow-[0_0_0_3px_rgba(62,111,154,0.1),0_10px_25px_-18px_rgba(26,54,84,0.35)]"
            )}
          >
            <span className="truncate">
              {value || placeholder}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors group-hover:bg-slate-200/80 group-hover:text-slate-600",
                value && "right-9",
              )}
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </span>
          </Button>
        </PopoverTrigger>

        {value && (
          <button
            type="button"
            aria-label={`Очистить фильтр «${placeholder}»`}
            title="Очистить"
            onClick={(event) => {
              event.stopPropagation()
              onChange(undefined)
              setOpen(false)
            }}
            className="absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent
        forceMount
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 transition-[opacity,transform] duration-150 ease-out will-change-[opacity,transform] data-[state=open]:animate-none data-[state=closed]:animate-none",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <Command className="max-h-[min(360px,var(--radix-popover-content-available-height))]">
          <CommandInput placeholder="Поиск..." />
          <CommandList className="min-h-0 flex-1">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    // Preserve the original casing instead of Command's normalized search value.
                    onChange(option)
                    setOpen(false)
                  }}
                  className="pr-8"
                >
                  <Check
                    className={cn(
                      "absolute right-2 h-4 w-4",
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
