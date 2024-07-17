import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { AnchorPropsWithSelection } from "node_modules/@headlessui/react/dist/internal/floating";
import React from "react";
import { cn } from "~/lib/utils";

type OptionType = {
  value: string;
  name: string;
};

interface DropDownProps {
  selected: OptionType;
  onChange: (value: string) => void;
  options: OptionType[];
  placeholder?: string | React.ReactNode;
  anchor?: AnchorPropsWithSelection;
}

export const DropDown = ({
  selected,
  onChange,
  options,
  placeholder = "Select an option",
}: DropDownProps) => {
  return (
    <Listbox value={selected.value} onChange={onChange}>
      {({ open }) => (
        <>
          <div className="relative mt-2">
            <ListboxButton
              className={cn(
                "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
              )}
            >
              <span className="block truncate">
                {selected.name || placeholder}
              </span>
              <CaretSortIcon
                className="h-4 w-4 opacity-50"
                aria-hidden="true"
              />
            </ListboxButton>

            <Transition
              show={open}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {options.map((option) => (
                  <ListboxOption
                    key={option.value}
                    className={({ focus }) =>
                      cn(
                        focus ? "bg-gray-100" : "",
                        !focus ? "text-gray-900" : "",
                        "relative cursor-default select-none py-2 pl-3 pr-9",
                      )
                    }
                    value={option.value}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={cn(
                            selected ? "font-semibold" : "font-normal",
                            "block truncate",
                          )}
                        >
                          {option.name}
                        </span>

                        {selected ? (
                          <span
                            className={cn(
                              "absolute inset-y-0 right-0 flex items-center pr-4 text-primary",
                            )}
                          >
                            <CheckIcon
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </span>
                        ) : null}
                      </>
                    )}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  );
};
