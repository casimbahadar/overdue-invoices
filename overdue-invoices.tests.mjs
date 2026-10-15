// node overdue-invoices.tests.mjs
// Runs the CORE block extracted from the shipped index.html against answers worked out by hand (expected.json).
import { readFileSync, existsSync } from "node:fs";
const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const core = read("./index.html").split("/* CORE-START")[1].split("/* CORE-END */")[0].replace(/^[^\n]*\n/, "");
const A = new Function(core + "\nreturn Aging;")();
const E = JSON.parse(read("./expected.json"));
let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) pass++; else { fail++; console.log("FAIL " + name + (detail !== undefined ? "  :: " + JSON.stringify(detail).slice(0, 300) : "")); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const strip = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const a = A.analyze(A.sampleCSV(E.as_of), E.as_of);
check("sample: 25 invoices read", a.items.length === 25, a.items.length);
check("band totals to the cent", same(a.bands, E.bands_cents), a.bands);
check("band counts", same(a.counts, E.band_counts), a.counts);
check("total owed $19,836.55 and overdue $13,246.55", a.total === E.total_owed_cents && a.overdue === E.overdue_cents, [a.total, a.overdue]);
for (const [inv, [days, band]] of Object.entries(E.boundaries)) { const i = a.items.find(x => x.invoice === inv); check(`${inv}: ${days} days late lands in ${band}`, i.daysLate === days && i.band === band, [i.daysLate, i.band]); }
check("paid in full is left out", same(a.paid.map(i => i.invoice), E.excluded.paid_in_full));
check("overpaid invoice is a $50.00 credit, left out", same(a.credits.map(i => [i.invoice, -i.balance]), E.excluded.credit));
check("dates the wrong way round and a non-number amount need checking", same(a.check.map(i => i.invoice), E.excluded.needs_checking) && /before the invoice date/.test(a.check[0].problems[0]) && /isn't a number/.test(a.check[1].problems[0]));
check("partly paid: only the balance is chased", a.items.find(i => i.invoice === "INV-2108").balance === 48000 && a.items.find(i => i.invoice === "INV-2116").balance === 227500);
for (const t of ["friendly", "firm", "final"]) check(`${t} reminders: right customers and totals`, same(a.reminders.filter(r => r.tone === t).map(r => [strip(r.customer), r.total]).sort(), E.reminders[t].slice().sort()), a.reminders.filter(r => r.tone === t).map(r => [r.customer, r.total]));
check("14 reminders, one per customer", a.reminders.length === E.reminder_count && new Set(a.reminders.map(r => r.customer)).size === a.reminders.length);
check("reminders add up to the overdue total", a.reminders.reduce((s, r) => s + r.total, 0) === a.overdue);
const raman = a.reminders.find(r => r.customer === "Raman Dental");
check("Raman Dental: one final reminder listing 3 invoices, oldest first", raman.tone === "final" && same(raman.invoices.map(i => i.invoice), E.raman_dental_invoices) && raman.body.includes("Total past due: $2,440.50"));
const kowal = a.reminders.find(r => r.customer === "Kowal Hardware");
check("Kowal Hardware: the invoice not yet due is left out of the reminder", kowal.invoices.length === 1 && !kowal.body.includes("INV-2115"));
check("no email: marked to call, and left out of the mail merge", a.reminders.filter(r => !r.email).map(r => strip(r.customer)).join() === E.call_instead.join() && A.mergeRows(a).length === E.mail_merge_rows);
const BANNED = /collection|legal|lawyer|court|interest|credit bureau|agency|penalt|lawsuit|sue\b/i;
const bad = a.reminders.filter(r => BANNED.test(r.subject + " " + r.body)).map(r => r.customer);
check("no reminder threatens collections or legal action, or adds interest", bad.length === 0, bad);
check("tone wording steps up", /friendly reminder/.test(a.reminders.find(r => r.tone === "friendly").body) && /more than 30 days past due/.test(a.reminders.find(r => r.tone === "firm").body) && /final reminder/.test(a.reminders.find(r => r.tone === "final").body));
check("firm and final ask for contact by a date a week out", a.reminders.find(r => r.tone === "final").body.includes("by October 22, 2026"));
// formats
const fr = "Facture;Client;Courriel;Date de facture;Échéance;Montant;Payé\nF-1;Bistro Élodie;elodie@example.org;1 septembre 2026;1 octobre 2026;1 234,50;234,50\n";
const f = A.analyze(fr, E.as_of);
check("French headers, semicolons, comma decimals and French month names", !f.error && f.open.length === 1 && f.open[0].balance === 100000 && f.open[0].daysLate === 14, f.error || f.open[0]);
const amb = "Invoice,Customer,Due date,Amount\nA-1,Test Co,03/04/2026,100.00\n";
const m1 = A.analyze(amb, E.as_of), m2 = A.analyze(amb, E.as_of, { dayFirst: true });
check("03/04/2026 is flagged as ambiguous and read either way", m1.ambiguous && m1.open[0].dueDate === "2026-03-04" && m2.open[0].dueDate === "2026-04-03");
check("13/04/2026 can only be April 13, so it isn't ambiguous", !A.analyze("Invoice,Customer,Due date,Amount\nA-1,Test Co,13/04/2026,100.00\n", E.as_of).ambiguous);
check("missing columns give a plain error", /invoice number/.test(A.analyze("Foo,Bar\n1,2\n", E.as_of).error || ""));
check("money as people write it", A.parseMoney("$1,234.50") === 123450 && A.parseMoney("1 234,50") === 123450 && A.parseMoney("1.234,50") === 123450 && A.parseMoney("(12.00)") === -1200 && A.parseMoney("TBD") === null && A.parseMoney("45") === 4500);
if (existsSync(new URL("./reconcile-invoices.csv", import.meta.url))) {
  const r = A.analyze(read("./reconcile-invoices.csv"), E.as_of);
  check("the reconciliation demo's invoice file loads: 40 invoices, due 30 days after the invoice date, all to call", !r.error && r.items.length === 40 && r.notices.length === 3 && r.items.every(i => i.status !== "check") && r.reminders.every(x => !x.email), r.error || r.notices);
}
// outputs
const evil = A.analyze('Invoice,Customer,Email,Due date,Amount\n=SUM(A1),"=HYPERLINK(""x"")",a@b.example,2026-09-01,10.00\n', E.as_of);
const csv = A.toCSV(A.AGING_HEAD, A.agingRows(evil)) + A.toCSV(A.MERGE_HEAD, A.mergeRows(evil));
check("formulas in names become text in every download", csv.includes(`"'=HYPERLINK(""x"")"`) && !/(^|,)=/.test(csv.replace(/"'=/g, "")), csv);
check("aging report: one row per customer plus a total row, 7 columns", A.agingRows(a).length === a.customers.length + 1 && A.AGING_HEAD.length === 7 && A.agingRows(a).at(-1)[6] === "19836.55");
// speed
const lines = ["Invoice number,Customer,Email,Invoice date,Due date,Amount,Paid"];
for (let i = 0; i < 5000; i++) lines.push(`INV-${i},Customer ${i % 700},c${i % 700}@example.com,2026-0${1 + (i % 9)}-01,2026-${String(2 + (i % 9)).padStart(2, "0")}-01,${(i % 900) + 10}.25,${i % 3 ? "" : "5.00"}`);
const t0 = performance.now(); const big = A.analyze(lines.join("\n"), E.as_of); const ms = performance.now() - t0;
check(`5,000 invoices read, aged and grouped in ${ms.toFixed(0)} ms (under 500)`, !big.error && big.items.length === 5000 && ms < 500 && big.reminders.length > 0);
check("totals add up exactly at 5,000 invoices", big.total === Object.values(big.bands).reduce((s, v) => s + v, 0));
console.log(`\n${pass}/${pass + fail} tests passed`);
process.exit(fail ? 1 : 0);
