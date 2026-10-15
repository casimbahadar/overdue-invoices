# Overdue invoices (demo)

Load an invoice list and see what's owed, grouped by how late it is. Each customer with overdue invoices gets one reminder that gets firmer as the bill gets older. Everything runs in the browser. The sample company, Cedar & Copper Plumbing, and its customers are made up.

Live: https://casimbahadar.github.io/overdue-invoices/

## What a visitor does

1. Loads the sample invoices, chooses a CSV file, or pastes a spreadsheet. They can change the date lateness is worked out from, which defaults to today.
2. Sees the total owed and the overdue amount, grouped into five bands: not yet due, 1 to 30, 31 to 60, 61 to 90, and over 90 days late.
3. Sees each customer's balance across those bands. This is a table on wider screens and one block per customer on phones. It can be downloaded as an aging report.
4. Gets one reminder per customer, listing every overdue invoice oldest first. The oldest invoice sets the tone:
   - friendly, from 1 to 30 days late
   - firm, from 31 to 60 days late
   - final, from 61 days on

   Each reminder can be copied or marked as sent. All of them download as one spreadsheet for a mail merge, and the reminders marked as sent download as a follow-up log.

## The reminder wording

Every reminder asks the customer to get in touch. None of them threatens collections or legal action, and none adds interest, which is only allowed if the original invoice terms said so. The tests check every draft for words like collections, legal, lawyer, court, interest and credit bureau.

## What the file needs

The file needs an invoice number, a customer and an amount, or a balance. It also reads email, invoice date, due date, and amount paid or balance, under English or French column names, with commas, semicolons or tabs between them.

- With no due date column, each invoice is due 30 days after its invoice date.
- With no payment or balance column, every invoice is treated as unpaid.
- With no email column, each customer is marked to be called instead.

The page says so on screen in each case. That's how the reconciliation demo's invoice file (https://casimbahadar.github.io/accounting-reconciliation/) loads here.

**Dates it reads:** 2026-10-15, October 15, 2026, 15 octobre 2026 and 10/15/2026. A date like 03/04/2026 could be read two ways, so a switch appears to say which comes first.

**Amounts it reads:** amounts like $1,234.50, 1 234,50 and (12.00).

**Set aside for a person to check,** and left out of the totals and reminders:
- invoices whose due date is before their invoice date
- amounts that aren't numbers
- dates that can't be read

Invoices paid in full are left out. Overpaid invoices are listed as credits owed to the customer.

## Sample, checked to the cent

There are 25 invoices for 21 customers, worked out by hand first in `expected.json`, as of October 15, 2026.

| Band | Invoices | Amount |
|---|---|---|
| Not yet due | 5 | $6,590.00 |
| 1 to 30 days late | 5 | $1,620.80 |
| 31 to 60 days late | 5 | $3,570.25 |
| 61 to 90 days late | 5 | $5,905.50 |
| Over 90 days late | 1 | $2,150.00 |
| Total owed | | $19,836.55 |
| Overdue | | $13,246.55 |

That gives 14 reminders: 4 friendly, 4 firm and 6 final. They add up to exactly the overdue total. One customer has no email address, so 13 go in the mail merge.

The sample includes deliberate traps:
- invoices exactly 30, 31, 60, 61 and 90 days late
- one due today
- partly paid invoices
- one paid in full and one overpaid
- dates the wrong way round, and an amount of "TBD"
- one customer with three overdue invoices in different bands

## Privacy

Nothing leaves the page. Its security settings block every network request, files are read in the browser and not saved, and anything in a file is shown as plain text, never run as code. Spreadsheet downloads put an apostrophe in front of any cell starting with =, +, - or @, so a spreadsheet won't run it as a formula.

## Files

- `index.html`: the whole page. The logic sits between the `CORE-START` and `CORE-END` markers.
- `overdue-invoices.tests.mjs`: checks a developer can run with Node (`node overdue-invoices.tests.mjs`). They check the page against `expected.json`, and cover the boundaries, the wording, the file formats, the downloads and speed at 5,000 invoices.
- `expected.json`: the hand-worked answers for the sample.
- `reconcile-invoices.csv`: the reconciliation demo's sample invoices, used to test that its layout loads.
- `.nojekyll`: tells GitHub Pages to serve the files as they are.

## How a version for your business would differ

It could read invoices straight from your accounting software instead of an exported file. It could send reminders from your own email address on a schedule you choose, and stop as soon as a payment comes in. You'd approve the wording once and still see every message before it goes.

## How AI was used to build this

The page was written with an AI coding assistant. It was checked by the tests above, by headless browser tests, by a UI audit at three screen widths, and by a security scan. No AI runs on the page itself.

Built by Casim Bahadar, Kitchener-Waterloo, Ontario. https://casimbahadar.github.io/
