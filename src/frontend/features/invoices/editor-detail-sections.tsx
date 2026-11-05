import { useState } from "react"

import { Field, FieldDescription, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"
import { Textarea } from "@components/ui/textarea"

import {
  addDaysIso,
  DUE_PRESET_DAYS,
  formatLongDate,
  matchingDuePreset,
} from "@features/invoices/helpers"
import type { InvoiceDraft } from "@features/invoices/invoice-draft"

const CURRENCIES = [
  "usd",
  "eur",
  "gbp",
  "cad",
  "aud",
  "nzd",
  "chf",
  "sek",
  "nok",
  "dkk",
] as const

const currencyNames = new Intl.DisplayNames(undefined, { type: "currency" })

const CUSTOM_DUE = "custom"

type DraftPatch = Partial<InvoiceDraft>

function dueOptionLabel(days: number) {
  return days === 0 ? "Due on receipt" : `Within ${days} days`
}

export function EditorCurrencySection({
  currency,
  onChange,
}: {
  currency: string
  onChange: (patch: DraftPatch) => void
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-light tracking-tight">Currency</h2>
      <Select
        value={currency}
        onValueChange={(next) => next && onChange({ currency: next })}
      >
        <SelectTrigger className="w-full" aria-label="Currency">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((code) => (
            <SelectItem key={code} value={code}>
              {code.toUpperCase()} – {currencyNames.of(code.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  )
}

export function EditorPaymentSection({
  draft,
  onChange,
}: {
  draft: InvoiceDraft
  onChange: (patch: DraftPatch) => void
}) {
  const preset = matchingDuePreset(draft.issueDate, draft.dueDate)
  const [custom, setCustom] = useState(
    Boolean(draft.dueDate) && preset === null
  )
  const selectValue = custom || preset === null ? CUSTOM_DUE : String(preset)

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-light tracking-tight">Payment</h2>
      <Field>
        <FieldLabel htmlFor="payment-due">Payment due</FieldLabel>
        <Select
          value={selectValue}
          onValueChange={(next) => {
            if (!next) return
            if (next === CUSTOM_DUE) {
              setCustom(true)
              if (!draft.dueDate) {
                onChange({ dueDate: addDaysIso(draft.issueDate, 30) })
              }
              return
            }
            setCustom(false)
            onChange({ dueDate: addDaysIso(draft.issueDate, Number(next)) })
          }}
        >
          <SelectTrigger id="payment-due" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DUE_PRESET_DAYS.map((days) => (
              <SelectItem key={days} value={String(days)}>
                {dueOptionLabel(days)}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_DUE}>On a specific date</SelectItem>
          </SelectContent>
        </Select>
        {selectValue === CUSTOM_DUE ? (
          <Input
            type="date"
            aria-label="Due date"
            value={draft.dueDate}
            min={draft.issueDate}
            onChange={(event) => onChange({ dueDate: event.target.value })}
          />
        ) : null}
        {draft.dueDate ? (
          <FieldDescription>
            Due {formatLongDate(draft.dueDate)}
          </FieldDescription>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="bank-details">Bank transfer details</FieldLabel>
        <Textarea
          id="bank-details"
          value={draft.bankDetails}
          rows={3}
          placeholder="Account name, IBAN or account and routing number"
          onChange={(event) => onChange({ bankDetails: event.target.value })}
        />
        <FieldDescription>
          Shown on the invoice so your customer knows how to pay.
        </FieldDescription>
      </Field>
    </section>
  )
}

export function EditorAdditionalSection({
  draft,
  onChange,
}: {
  draft: InvoiceDraft
  onChange: (patch: DraftPatch) => void
}) {
  const preset = matchingDuePreset(draft.issueDate, draft.dueDate)

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-light tracking-tight">Additional options</h2>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="invoice-number">Invoice number</FieldLabel>
          <Input
            id="invoice-number"
            value={draft.number}
            className="font-mono"
            onChange={(event) => onChange({ number: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="issue-date">Date of issue</FieldLabel>
          <Input
            id="issue-date"
            type="date"
            value={draft.issueDate}
            onChange={(event) => {
              const issueDate = event.target.value
              onChange(
                preset !== null && issueDate
                  ? { issueDate, dueDate: addDaysIso(issueDate, preset) }
                  : { issueDate }
              )
            }}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="invoice-notes">Notes</FieldLabel>
        <Textarea
          id="invoice-notes"
          value={draft.notes}
          rows={3}
          placeholder="Thanks for your business!"
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </Field>
    </section>
  )
}
