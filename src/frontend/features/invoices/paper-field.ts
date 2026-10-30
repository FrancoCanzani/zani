export const paperInputClass =
  "h-auto min-h-0 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-sm shadow-none focus-visible:border-border focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100"

export const paperNumberClass = `${paperInputClass} font-mono tabular-nums text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`

export const paperDateClass = `${paperInputClass} font-mono tabular-nums [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`

export const paperSelectTriggerClass =
  "m-0! h-auto! min-h-0 w-full justify-start gap-1 rounded-none border-0 bg-transparent p-0! py-0! text-sm leading-5 shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 data-[size=default]:h-auto! data-[size=sm]:h-auto! data-[size=sm]:rounded-none data-[size=xs]:h-auto! data-[size=xs]:p-0! dark:bg-transparent dark:hover:bg-transparent [&>svg]:ml-1 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:opacity-40 *:data-[slot=select-value]:leading-5"
