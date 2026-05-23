import { computed, defineComponent } from 'vue'
import {
  Users,
  Package,
  ClipboardList,
  ShoppingCart,
  Tags,
  Truck,
  Plus,
  AlertTriangle,
  Sun,
  Moon,
  LogOut,
  Lock,
  Wrench,
  CalendarClock,
  CircleHelp,
} from 'lucide-vue-next'
import { useCan } from '@/features/auth/composables/useCan'

// In-app help. Plain HTML/Tailwind with anchored sections so non-technical
// staff can read straight through or jump to what they need. Some sections
// are privileged-only (admin/doctor) and hidden for the limited tier so
// they aren't presented with instructions for buttons they don't have.

const Section = defineComponent({
  name: 'HelpSection',
  props: {
    id: { type: String, required: true },
    title: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => (
      <section id={props.id} class="scroll-mt-6 space-y-3">
        <h2 class="text-xl font-semibold tracking-tight border-b border-border pb-2">
          {props.title}
        </h2>
        <div class="space-y-3 text-sm leading-relaxed">{slots.default?.()}</div>
      </section>
    )
  },
})

const NOTE_STYLES = {
  info: 'border-sky-500/40 bg-sky-500/5 text-sky-900 dark:text-sky-200',
  warn: 'border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200',
  tip: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200',
} as const

const Note = defineComponent({
  name: 'HelpNote',
  props: {
    kind: {
      type: String as () => keyof typeof NOTE_STYLES,
      default: 'info',
    },
  },
  setup(props, { slots }) {
    return () => (
      <div class={`rounded-md border px-3 py-2 text-sm ${NOTE_STYLES[props.kind]}`}>
        {slots.default?.()}
      </div>
    )
  },
})

const Kbd = defineComponent({
  name: 'HelpKbd',
  setup(_, { slots }) {
    return () => (
      <kbd class="px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground border border-border">
        {slots.default?.()}
      </kbd>
    )
  },
})

type TocEntry = {
  id: string
  label: string
  privileged?: boolean // admin | doctor
  adminOnly?: boolean // admin only
}

const ALL_SECTIONS: TocEntry[] = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'patients', label: 'Patients' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'categories', label: 'Categories', privileged: true },
  { id: 'suppliers', label: 'Suppliers', privileged: true },
  { id: 'appointments', label: 'Appointments' },
  { id: 'visits', label: 'Visits & prescriptions' },
  { id: 'sales', label: 'Sales' },
  { id: 'movements', label: 'Stock movements' },
  { id: 'roles', label: 'Roles & permissions' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
  { id: 'admin', label: 'For admins', adminOnly: true },
]

export default defineComponent({
  name: 'HelpView',
  setup() {
    const { canManageProducts, isAdmin } = useCan()

    const visibleSections = computed(() =>
      ALL_SECTIONS.filter((s) => {
        if (s.adminOnly) return isAdmin.value
        if (s.privileged) return canManageProducts.value
        return true
      }),
    )

    return () => (
      <div class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
        {/* TOC */}
        <aside class="lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-auto">
          <div class="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            On this page
          </div>
          <nav class="flex flex-col gap-1 text-sm">
            {visibleSections.value.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                class="px-2 py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div class="space-y-10 min-w-0">
          <header class="space-y-2">
            <div class="flex items-center gap-2 text-muted-foreground text-sm">
              <CircleHelp class="size-4" />
              <span>Help & user guide</span>
            </div>
            <h1 class="text-3xl font-semibold tracking-tight">
              How to use the Clinic Portal
            </h1>
            <p class="text-sm text-muted-foreground">
              A walkthrough for daily clinic operations — patients, inventory,
              dispensing, visits, and sales. Skim the section you need or read
              straight through.
            </p>
          </header>

          <Section id="getting-started" title="Getting started">
            <p>
              Sign in with the email and password your admin set up for you.
              After signing in you'll land on the <strong>Dashboard</strong>.
              Use the left sidebar to switch between sections.
            </p>
            <p class="flex flex-wrap items-center gap-2">
              Top-right of every screen:
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs">
                <Sun class="size-3" />/<Moon class="size-3" /> theme
              </span>
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs">
                <LogOut class="size-3" /> sign out
              </span>
            </p>
            <Note kind="tip">
              On a phone? Tap the menu icon in the top-left to open the
              sidebar — it slides out as a drawer on small screens.
            </Note>
            <Note kind="info">
              Some buttons (e.g. <strong>New product</strong>,{' '}
              <strong>New visit</strong>, the remove icons) only appear for
              admin / doctor accounts. See the{' '}
              <a href="#roles" class="underline">Roles & permissions</a>{' '}
              section for the full breakdown — if you don't see a button
              someone else does, it's likely a role thing.
            </Note>
          </Section>

          <Section id="dashboard" title="Dashboard">
            <p>
              Five cards summarise the state of the clinic right now. Cards
              stay grey when there's nothing to flag — they light up with
              colour only when there's something worth your attention.
            </p>
            <ul class="space-y-2 list-none pl-0">
              <li class="flex gap-3 items-start">
                <Package class="size-4 mt-0.5 text-red-700 dark:text-red-400 shrink-0" />
                <div>
                  <strong>Low stock</strong> — products at or below their
                  reorder level. Click a row to open that product.
                </div>
              </li>
              <li class="flex gap-3 items-start">
                <AlertTriangle class="size-4 mt-0.5 text-amber-700 dark:text-amber-400 shrink-0" />
                <div>
                  <strong>Expiring soon</strong> — batches with stock
                  expiring within 60 days. Turns red once any batch is
                  within 14 days.
                </div>
              </li>
              <li class="flex gap-3 items-start">
                <ClipboardList class="size-4 mt-0.5 text-sky-700 dark:text-sky-400 shrink-0" />
                <div>
                  <strong>Today's follow-ups</strong> — patients due back
                  today, based on the follow-up date set on their last
                  visit. Click a name to open the patient.
                </div>
              </li>
              <li class="flex gap-3 items-start">
                <ClipboardList class="size-4 mt-0.5 text-sky-700 dark:text-sky-400 shrink-0" />
                <div>
                  <strong>Upcoming follow-ups</strong> — the next 3 days.
                  Rows read "Tomorrow", "Day after tomorrow", or the actual
                  date.
                </div>
              </li>
              <li class="flex gap-3 items-start">
                <ShoppingCart class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <strong>Recent sales</strong> — the last 10 products
                  dispensed. Click <strong>View all sales</strong> to open
                  the full Sales page.
                </div>
              </li>
            </ul>
            <Note kind="info">
              All five cards load in parallel — if one is slower or
              erroring, the others still render. A card with an{' '}
              <span class="text-red-700 dark:text-red-400 font-medium">Error</span>{' '}
              badge means that query failed — usually a temporary connection
              blip; refresh the page.
            </Note>
          </Section>

          <Section id="patients" title="Patients">
            <p>
              Open <strong>Patients</strong> from the sidebar. The list
              shows every active patient with their client number, name, and
              phone. Search at the top filters by name, phone, or client
              number — type and results update as you go.
            </p>
            <Note kind="tip">
              <strong>Search tips:</strong>
              <ul class="list-disc pl-5 mt-1 space-y-0.5">
                <li>
                  Typing a number (e.g. <code class="text-xs bg-muted px-1 rounded">1297</code>)
                  matches any client number, plus any phone number containing
                  those digits.
                </li>
                <li>
                  Prefix with <code class="text-xs bg-muted px-1 rounded">#</code>
                  (e.g. <code class="text-xs bg-muted px-1 rounded">#1297</code>)
                  to search by <strong>client number only</strong> — useful
                  when the same digits appear inside someone's phone and
                  clutter the results.
                </li>
                <li>
                  Typing letters (e.g. <code class="text-xs bg-muted px-1 rounded">Asha</code>)
                  matches names.
                </li>
              </ul>
            </Note>

            <h3 class="text-base font-medium pt-2">Add a patient</h3>
            <ol class="list-decimal pl-5 space-y-1">
              <li>
                Click{' '}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs">
                  <Plus class="size-3" /> New patient
                </span>{' '}
                at the top right. <em>(Available to all roles.)</em>
              </li>
              <li>
                Fill in <strong>name</strong> and <strong>phone</strong> at
                minimum. Age, gender, email, address, notes are optional.
              </li>
              <li>
                The <strong>Client #</strong> auto-fills if you leave it
                blank — the next number in sequence. You can override it
                only when adding (not editing).
              </li>
              <li>Click <strong>Save</strong>.</li>
            </ol>

            <h3 class="text-base font-medium pt-2">Find or edit a patient</h3>
            <p>
              Click the patient's row to open their detail page. From there
              you can <strong>Edit</strong> (all roles), or{' '}
              <strong>Remove</strong> and start a <strong>New visit</strong>{' '}
              (admin / doctor only).
            </p>
            <Note kind="warn">
              "Remove" is a <strong>soft delete</strong>. The patient stops
              appearing in lists, but their visit and sales history is
              preserved. If you remove someone by mistake, ask your admin to
              restore.
            </Note>
          </Section>

          <Section id="inventory" title="Inventory">
            <p>
              Open <strong>Inventory</strong> from the sidebar. Each row
              shows the product, category, supplier, current stock, and
              expiry. Two badges to watch:
            </p>
            <ul class="space-y-1 pl-0">
              <li>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-700 dark:text-red-400">
                  Out
                </span>{' '}
                — stock is zero.
              </li>
              <li>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  Low
                </span>{' '}
                — stock is at or below its reorder level. Reorder level is
                set per-product on creation / edit.
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">
              Add a product <em class="text-xs text-muted-foreground font-normal">(admin / doctor)</em>
            </h3>
            <ol class="list-decimal pl-5 space-y-1">
              <li>
                Click <strong>New product</strong>.
              </li>
              <li>
                <strong>Name</strong> and <strong>Supplier</strong> are
                required. Both <strong>Category</strong> and{' '}
                <strong>Supplier</strong> are dropdowns — pick an existing
                entry or type a new name to create it inline.
              </li>
              <li>
                Set <strong>Selling price</strong>, <strong>Cost price</strong>,{' '}
                <strong>Reorder level</strong>, and an{' '}
                <strong>Initial stock</strong> if you have units on hand
                already.
              </li>
              <li>
                Save. If initial stock {'>'} 0, a <strong>PURCHASE</strong>{' '}
                movement is recorded automatically.
              </li>
            </ol>

            <h3 class="text-base font-medium pt-2">
              Record stock changes <em class="text-xs text-muted-foreground font-normal">(all roles)</em>
            </h3>
            <p>
              Every change in inventory is logged as a <strong>movement</strong>{' '}
              — a single dated entry that says "X units of product Y were
              added or removed because of Z." All movements together = the
              full stock history. The "Current stock" number on a product
              is computed from these movements; you never edit it directly.
            </p>
            <p>
              Open a product → click <strong>Record movement</strong> →
              pick the right type from the dropdown. Always enter the
              quantity as a <strong>positive number</strong>; the portal
              knows whether to add or subtract based on the type.
            </p>

            <div class="overflow-x-auto rounded-md border border-border mt-1">
              <table class="w-full text-xs">
                <thead class="bg-muted/40 text-muted-foreground">
                  <tr class="text-left">
                    <th class="px-3 py-2 font-medium">Type</th>
                    <th class="px-3 py-2 font-medium">Direction</th>
                    <th class="px-3 py-2 font-medium">Use it when…</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-t border-border">
                    <td class="px-3 py-2 font-medium">Purchase</td>
                    <td class="px-3 py-2 text-emerald-700 dark:text-emerald-400">+ adds stock</td>
                    <td class="px-3 py-2">New stock arrived from a supplier.</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-3 py-2 font-medium">Adjustment in</td>
                    <td class="px-3 py-2 text-emerald-700 dark:text-emerald-400">+ adds stock</td>
                    <td class="px-3 py-2">Physical count is higher than the system. Use this to correct upward.</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-3 py-2 font-medium">Adjustment out</td>
                    <td class="px-3 py-2 text-amber-700 dark:text-amber-400">− removes stock</td>
                    <td class="px-3 py-2">Physical count is lower than the system. Use this to correct downward (unit went missing, given as sample, etc.).</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-3 py-2 font-medium">Damage</td>
                    <td class="px-3 py-2 text-amber-700 dark:text-amber-400">− removes stock</td>
                    <td class="px-3 py-2">A unit was broken, spilled, or otherwise made unusable.</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-3 py-2 font-medium">Expired</td>
                    <td class="px-3 py-2 text-amber-700 dark:text-amber-400">− removes stock</td>
                    <td class="px-3 py-2">A unit crossed its expiry date and is being written off.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 class="text-sm font-medium pt-2">What happens after you click "Record"</h4>
            <ol class="list-decimal pl-5 space-y-1">
              <li>
                A new row appears in the product's{' '}
                <strong>Movement history</strong> at the bottom of the
                page.
              </li>
              <li>
                <strong>Current stock</strong> updates immediately — up
                for Purchase / Adjustment in, down for the others.
              </li>
              <li>
                The entry is stamped with <strong>your name</strong> and
                the exact time, so the audit trail shows who recorded
                what.
              </li>
            </ol>

            <Note kind="warn">
              Movements can't be edited or deleted — the inventory ledger
              has to be tamper-proof for trust. If you make a mistake,
              record an <strong>Adjustment</strong> in the opposite
              direction to cancel it out, and use the <em>Remarks</em>{' '}
              field to explain (e.g. "correcting earlier 50-unit purchase
              entry — only 30 arrived").
            </Note>

            <h4 class="text-sm font-medium pt-2">Quick scenarios</h4>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>5 boxes of Dershine arrived from the supplier</strong>
                {' '}→ Purchase → 5.
              </li>
              <li>
                <strong>Daily count: shelf has 8 units, system says 10</strong>
                {' '}→ Adjustment out → 2 → Remark: "Daily count correction."
              </li>
              <li>
                <strong>A bottle of Acless fell and broke</strong>
                {' '}→ Damage → 1 → Remark: "Bottle dropped, contents lost."
              </li>
              <li>
                <strong>Three sachets past expiry</strong>
                {' '}→ Expired → 3 → Remark: "Batch 24A02 expired."
              </li>
              <li>
                <strong>Patient buying a product</strong> → ❌ Do{' '}
                <em>not</em> record a movement. Use the cart icon{' '}
                <ShoppingCart class="inline size-3.5 mx-0.5" /> or{' '}
                <strong>Sell</strong> button instead — sales need to be
                linked to a patient, and the dedicated Sell flow handles
                that.
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">
              Sell / dispense a product <em class="text-xs text-muted-foreground font-normal">(all roles)</em>
            </h3>
            <ol class="list-decimal pl-5 space-y-1">
              <li>
                On the inventory list, click the{' '}
                <ShoppingCart class="inline size-3.5 mx-0.5" /> icon on the
                product's row — or open the product and click <strong>Sell</strong>.
              </li>
              <li>Search and pick a patient.</li>
              <li>Set the quantity. Total is shown live.</li>
              <li>
                Click <strong>Sell</strong>. Stock is reduced and a SALE
                movement is recorded against the patient.
              </li>
            </ol>
            <Note kind="info">
              Trying to sell more than available shows a clear "Only N in
              stock" error — the sale won't go through and stock stays the
              same. Same protection if two people try to sell the last unit
              at the same time — exactly one succeeds.
            </Note>
          </Section>

          {canManageProducts.value && (
            <Section id="categories" title="Categories">
              <p class="flex items-start gap-2">
                <Tags class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  Categories group products in inventory ("ANTI ACNE",
                  "HAIR SERUMS / MINOXIDIL", etc.). They're managed centrally
                  so the same name doesn't end up with three different
                  spellings across products.
                </span>
              </p>

              <h3 class="text-base font-medium pt-2">Two ways to add a category</h3>
              <ul class="list-disc pl-5 space-y-1">
                <li>
                  <strong>Inline</strong>: in the product form, type a new
                  name in the Category dropdown and click "Add …". Fastest
                  when you're already adding a product.
                </li>
                <li>
                  <strong>Categories page</strong>: open{' '}
                  <strong>Categories</strong> from the sidebar to add,
                  rename, or remove categories in bulk. Each row shows how
                  many products use that category.
                </li>
              </ul>

              <h3 class="text-base font-medium pt-2">Renaming and removing</h3>
              <ul class="list-disc pl-5 space-y-1">
                <li>
                  Click the pencil icon to rename. Press Enter to save,
                  Escape to cancel. Renames propagate to every product
                  using that category.
                </li>
                <li>
                  The trash icon is disabled while a category is in use —
                  the count on the right tells you how many products to
                  reassign first. To remove a still-used category, edit
                  those products and switch their Category to a different
                  one.
                </li>
              </ul>

              <Note kind="info">
                Category management is admin / doctor only. Limited tier
                accounts can still <em>see</em> categories on products,
                they just can't add or rename.
              </Note>
            </Section>
          )}

          {canManageProducts.value && (
            <Section id="suppliers" title="Suppliers">
              <p class="flex items-start gap-2">
                <Truck class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  Suppliers are the vendors you buy products from
                  ("Cipla", "Ethicare", "Arka Vital", etc.). Every product
                  must have one. Managed like categories — pick from the
                  dropdown in the product form or type a new name to create
                  inline; use the <strong>Suppliers</strong> page from the
                  sidebar to rename or remove entries in bulk.
                </span>
              </p>

              <h3 class="text-base font-medium pt-2">Renaming and removing</h3>
              <ul class="list-disc pl-5 space-y-1">
                <li>
                  Pencil icon to rename. Enter saves, Escape cancels.
                  Renames propagate to every product using that supplier.
                </li>
                <li>
                  The trash icon is disabled while a supplier is in use —
                  the count on the right tells you how many products to
                  reassign first. Unlike categories, supplier is a{' '}
                  <strong>required</strong> field, so you have to move
                  those products to a different supplier (you can't just
                  let them become un-assigned).
                </li>
              </ul>

              <Note kind="info">
                The database also blocks deletion of an in-use supplier
                with a "referenced elsewhere" error — the trash icon's
                disabled state matches that rule.
              </Note>
            </Section>
          )}

          <Section id="appointments" title="Appointments">
            <p class="flex items-start gap-2">
              <CalendarClock class="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>
                The portal version of the paper diary. Each row is one
                booking — patient, scheduled date + time, treatment,
                optional session number, status. Bookings still come in
                via WhatsApp / phone; this is where staff log them so
                everyone can see today's roster without waiting for the
                photo.
              </span>
            </p>

            <h3 class="text-base font-medium pt-2">Appointments vs Visits</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>Appointment</strong> = the expectation. "We expect
                Asha at 11 AM for her 3rd laser session." Created when the
                patient books.
              </li>
              <li>
                <strong>Visit</strong> = the clinical encounter that
                actually happened. Notes, treatment delivered, any
                products dispensed.
              </li>
              <li>
                When the patient arrives and is seen, the appointment
                converts into a visit — one click links them.
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">Create an appointment</h3>
            <ol class="list-decimal pl-5 space-y-1">
              <li>
                Open <strong>Appointments</strong> from the sidebar (page
                lands on today's scheduled list).
              </li>
              <li>
                Click{' '}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs">
                  <Plus class="size-3" /> New appointment
                </span>
                .
              </li>
              <li>
                Pick the patient, set the <strong>date &amp; time</strong>{' '}
                using the calendar popover — date on the left, time with
                AM/PM toggle on the right. Default is "today, next
                half-hour" so most bookings only need a few clicks.
              </li>
              <li>
                Write a short <strong>treatment description</strong> (e.g.
                "GFC", "Laser with peel", "DPN removal"). Optionally fill{' '}
                <strong>Session #</strong> for repeat treatments (3rd
                laser, 4th GFC, etc.).
              </li>
              <li>
                <strong>Doctor</strong> is optional — leave it empty when
                any doctor can see the patient, or pick a specific doctor
                when the patient has asked for one (e.g., "with Dr.
                Saranya"). Use the chip filter above the table to view
                "only Dr. Saranya's day" at a glance.
              </li>
              <li>
                Add <strong>Notes</strong> for anything that doesn't fit
                the other fields — confirmation status ("Not confirmed
                yet"), special requests, advance paid, etc.
              </li>
              <li>Save. Row appears in the list with status Scheduled.</li>
            </ol>

            <h3 class="text-base font-medium pt-2">Filtering the list</h3>
            <p>
              The filter row above the table is a single line of toggles:
            </p>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>Search</strong> by patient name, phone, or{' '}
                <code>#client</code> number (the same{' '}
                <code>#</code>-prefix shortcut that works on /patients).
              </li>
              <li>
                <strong>Status chips</strong> — Scheduled / Done /
                Cancelled, multi-select. Landing state shows Scheduled
                only.
              </li>
              <li>
                <strong>Doctor chips</strong> — one per doctor in your
                clinic. Click to filter to that doctor's appointments.
              </li>
              <li>
                <strong>From / To dates</strong> — defaults to today.
                Clear the dates to view the entire history.
              </li>
              <li>
                <strong>Sort</strong> — Soonest first (today's roster top-down), Latest first, or Recently added (book log).
              </li>
              <li>
                The small <strong>×</strong> button on the right resets
                everything back to "today's roster".
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">Status flow</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>Scheduled</strong> (default) — booked, not yet
                resolved.
              </li>
              <li>
                <strong>Done</strong> — the patient came and was seen.
                Set by clicking the check icon, which opens the New Visit
                form pre-filled with the patient and treatment. Saving
                that visit marks the appointment Done and links the two.
              </li>
              <li>
                <strong>Cancelled</strong> — the patient didn't come or
                cancelled. Use the slash icon. A small dialog prompts for
                a reason ("Out of station", "Patient declined", etc.) —
                cheap to write, useful for audit.
              </li>
              <li>
                A cancelled appointment can be restored to Scheduled via
                the circular-arrow icon if it was a mistake.
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">Today's appointments on the dashboard</h3>
            <p>
              The leftmost dashboard card shows the day's scheduled
              roster — count, patient name, assigned doctor, treatment,
              and time — at a glance. Click any row to open the full
              Appointments page filtered to today.
            </p>

            <Note kind="info">
              No reminders or capacity / time-slot enforcement in this
              version — two appointments at the same time is allowed
              (multiple doctors). If staff start asking for slot
              management or auto-reminders, we'll layer those on after
              real-usage feedback.
            </Note>
          </Section>

          <Section id="visits" title="Visits & prescriptions">
            <p>
              A <strong>visit</strong> is one clinical encounter — notes,
              treatment, optional prescribed products, and an optional
              follow-up date. Recording visits is admin / doctor only; all
              roles can <em>view</em> visit history.
            </p>

            <h3 class="text-base font-medium pt-2">
              Record a new visit <em class="text-xs text-muted-foreground font-normal">(admin / doctor)</em>
            </h3>
            <ol class="list-decimal pl-5 space-y-1">
              <li>
                Open <strong>Visits</strong> → <strong>New visit</strong>.
                Or, on a patient's detail page, click <strong>New visit</strong>{' '}
                to skip the patient-picking step.
              </li>
              <li>Pick the patient (skipped if pre-filled).</li>
              <li>
                Set a <strong>Follow-up date</strong> if the patient needs
                to come back — this is what populates the dashboard's
                Today's / Upcoming follow-ups cards.
              </li>
              <li>
                Write <strong>Doctor notes</strong> and{' '}
                <strong>Treatment details</strong>.
              </li>
              <li>
                Optional: add prescribed products with{' '}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border text-xs">
                  <Plus class="size-3" /> Add product
                </span>
                . Each line picks a product and a quantity. Subtotal shows
                live.
              </li>
              <li>Click <strong>Save visit</strong>.</li>
            </ol>
            <Note kind="info">
              Saving a visit with prescribed products{' '}
              <strong>atomically</strong> creates the visit AND dispenses
              each product. If any line doesn't have enough stock, the{' '}
              <em>entire</em> visit is rolled back — no partial state.
              You'll see a toast naming the failing product so you can fix
              the quantity and retry.
            </Note>

            <h3 class="text-base font-medium pt-2">Browse visit history</h3>
            <p>
              The Visits page lists all visits newest-first. Click any row
              to see the full visit detail (notes, treatment, dispensed
              lines with totals). Or open a patient and scroll to their{' '}
              <strong>Visit history</strong> card.
            </p>
          </Section>

          <Section id="sales" title="Sales">
            <p>
              The <strong>Sales</strong> page in the sidebar shows every
              product dispensed across visits and walk-in sells. Visible to
              all roles.
            </p>

            <h3 class="text-base font-medium pt-2">Stats at the top</h3>
            <p>
              Three cards summarise <strong>Today</strong>,{' '}
              <strong>This week</strong>, and <strong>This month</strong> —
              count and ₹ revenue for each window. The stats always reflect
              the whole clinic; they don't follow the filter bar.
            </p>

            <h3 class="text-base font-medium pt-2">Filtering</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>From / To</strong>: pick calendar days to narrow
                the list. Leave blank for "no bound."
              </li>
              <li>
                <strong>Patient</strong> and <strong>Product</strong>:
                multi-select. Type to search and click to add a chip; press
                Backspace in an empty input to pop the last chip; click the
                × on any chip to remove it.
              </li>
              <li>
                <strong>Clear</strong> in the filter-bar header resets
                everything.
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">The table</h3>
            <p>
              Newest sales first, 50 per page. Click a patient name or
              product name to jump to its detail page. Revenue is computed
              with the product's <em>current</em> selling price; if you
              change a price later the historical line totals will shift to
              the new price.
            </p>
          </Section>

          <Section id="movements" title="Stock movements">
            <p>
              <strong>Movements</strong> in the sidebar shows every change
              in inventory across <em>all</em> products in one place —
              purchases, sales, adjustments, damage, expired write-offs.
              Use this instead of opening each product individually when
              you want a bird's-eye view of stock activity.
            </p>

            <h3 class="text-base font-medium pt-2">How it differs from Sales</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>Sales</strong> shows only SALE rows, with revenue
                stats. Use it for "what did we earn / dispense?".
              </li>
              <li>
                <strong>Movements</strong> shows all types, no revenue
                totals. Use it for "where did the stock go?" or "when
                did we last receive Dershine?".
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">Filtering</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                <strong>Type chips</strong>: click Purchase, Sale,
                Adjustment, Damage, or Expired to narrow to one or more.
                None active = show all types.
              </li>
              <li>
                <strong>From / To</strong>: calendar-day range. Leave
                blank for no bound.
              </li>
              <li>
                <strong>Product</strong>: multi-select — drill into the
                history of one or more specific products without opening
                their detail pages.
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">The table</h3>
            <p>
              Newest first, 50 per page. <strong>Qty</strong> is{' '}
              <em>signed</em> — inflows show as <code>+5</code>, outflows
              as <code>−2</code>. Patient column is filled for SALE rows
              (and procedure-use rows); blank for stock-only movements.
              Click product or patient names to jump to their detail
              pages.
            </p>
          </Section>

          <Section id="roles" title="Roles & permissions">
            <p>
              Two effective tiers. Buttons you don't have access to are
              hidden from the UI; the database also enforces the rules so
              there's no way around them.
            </p>
            <div class="overflow-x-auto rounded-md border border-border mt-1">
              <table class="w-full text-xs">
                <thead class="bg-muted/40 text-muted-foreground">
                  <tr class="text-left">
                    <th class="px-3 py-2 font-medium">Action</th>
                    <th class="px-3 py-2 font-medium text-center">admin / doctor</th>
                    <th class="px-3 py-2 font-medium text-center">receptionist / staff</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Read everything (Patients / Inventory / Visits / Sales / Dashboard)', '✓', '✓'],
                    ['Create / edit patients', '✓', '✓'],
                    ['Soft-delete patients', '✓', '—'],
                    ['Create / edit / delete products', '✓', '—'],
                    ['Manage product categories', '✓', '—'],
                    ['Manage product suppliers', '✓', '—'],
                    ['Create / edit / change appointment status', '✓', '✓'],
                    ['Soft-delete an appointment', '✓', '—'],
                    ['Record stock movements (Purchase / Adjustment / Damage / Expired)', '✓', '✓'],
                    ['Sell product standalone', '✓', '✓'],
                    ['Create visit with prescriptions', '✓', '—'],
                  ].map((row, i) => (
                    <tr key={i} class="border-t border-border">
                      <td class="px-3 py-1.5">{row[0]}</td>
                      <td class="px-3 py-1.5 text-center">{row[1]}</td>
                      <td class="px-3 py-1.5 text-center">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note kind="info">
              If you think you should have access to something but don't,
              ask your admin to check your role.
            </Note>
          </Section>

          <Section id="troubleshoot" title="Troubleshooting">
            <h3 class="text-base font-medium">"Contact admin" screen after login</h3>
            <p>
              You signed in successfully but you don't have a profile
              attached to the clinic yet. Ask your admin to run the one-line
              SQL to onboard your account.
            </p>

            <h3 class="text-base font-medium pt-2">Login keeps failing</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Check the email is correct — case doesn't matter.</li>
              <li>
                If you forgot the password, ask your admin to reset it from
                the Supabase dashboard (no self-service yet).
              </li>
              <li>
                If the page hangs, refresh once with{' '}
                <Kbd>Cmd</Kbd>+<Kbd>R</Kbd> (Mac) or{' '}
                <Kbd>Ctrl</Kbd>+<Kbd>R</Kbd> (Windows).
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">Dashboard card shows "Error"</h3>
            <p>
              One query failed — the other cards are still good. Refresh the
              page. If it stays, tell your admin which card so they can
              check the database.
            </p>

            <h3 class="text-base font-medium pt-2">A button I expect to see isn't there</h3>
            <p>
              Most likely your role doesn't include that action. Check the{' '}
              <a href="#roles" class="underline">Roles & permissions</a>{' '}
              table to confirm. Ask your admin if you need a different role.
            </p>

            <h3 class="text-base font-medium pt-2">Patient / product search returns nothing</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>
                Patient search matches <strong>name</strong>,{' '}
                <strong>phone</strong>, or <strong>client number</strong>.
              </li>
              <li>
                Product search matches <strong>name</strong> or{' '}
                <strong>SKU</strong>. Categories aren't matched by the
                free-text search — they have their own filter.
              </li>
              <li>
                Partial matches are fine ("min" finds "Minoxidil"). Try a
                shorter substring if a longer phrase isn't matching.
              </li>
              <li>
                Removed (soft-deleted) patients / products are filtered out
                by design. Ask admin if you need to recover one.
              </li>
            </ul>

            <h3 class="text-base font-medium pt-2">Sell button is disabled</h3>
            <p>
              Product stock is zero. Record a <strong>Purchase</strong>{' '}
              movement first, or pick a different product.
            </p>

            <h3 class="text-base font-medium pt-2">"Something went wrong"</h3>
            <p class="flex items-start gap-2">
              <AlertTriangle class="size-4 mt-0.5 text-red-700 dark:text-red-400 shrink-0" />
              <span>
                A view hit an error and couldn't render. Click{' '}
                <strong>Try again</strong> or use the sidebar to navigate
                elsewhere. If you see the same error twice in a row, tell
                your admin and quote the message shown below it.
              </span>
            </p>
          </Section>

          {isAdmin.value && (
            <Section id="admin" title="For admins">
              <p class="flex items-start gap-2">
                <Lock class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  Onboarding and database operations are intentionally
                  SQL-only for now — there's no admin UI. Use the Supabase{' '}
                  <strong>SQL Editor</strong>.
                </span>
              </p>

              <h3 class="text-base font-medium pt-2">Onboard a new staff user</h3>
              <ol class="list-decimal pl-5 space-y-1">
                <li>
                  In Supabase Dashboard → <strong>Authentication → Users</strong>
                  , click <strong>Add user</strong> → <strong>Create new user</strong>.
                  Set email + password, leave "Auto Confirm User" on.
                </li>
                <li>
                  In <strong>SQL Editor</strong>, run:
                  <pre class="mt-2 p-3 rounded-md bg-muted text-xs overflow-x-auto"><code>{`insert into profiles (user_id, clinic_id, display_name, role)
values (
  (select id from auth.users where email = 'newperson@example.com'),
  (select id from clinics limit 1),
  'Dr. Asha',           -- display name; locked into audit history
  'doctor'              -- admin | doctor | receptionist | staff
);`}</code></pre>
                </li>
                <li>Tell the user to refresh / log in.</li>
              </ol>
              <Note kind="warn">
                Without a <code>profiles</code> row the user can sign in
                but every read/write is blocked by RLS — they'll see{' '}
                "Contact admin" until you run step 2.
              </Note>

              <h3 class="text-base font-medium pt-2">Reset a password</h3>
              <p>
                Supabase Dashboard → <strong>Authentication → Users</strong> →
                click the user → <strong>Send password recovery</strong>{' '}
                (or <strong>Reset password</strong> if you want to set one
                manually).
              </p>

              <h3 class="text-base font-medium pt-2">Change someone's role</h3>
              <pre class="p-3 rounded-md bg-muted text-xs overflow-x-auto"><code>{`update profiles
set role = 'doctor'   -- admin | doctor | receptionist | staff
where user_id = (select id from auth.users where email = 'them@example.com');`}</code></pre>
              <p>
                Effective immediately — ask them to refresh to pick up the
                new permissions in the UI.
              </p>

              <h3 class="text-base font-medium pt-2">
                Restore a soft-deleted patient or product
              </h3>
              <pre class="p-3 rounded-md bg-muted text-xs overflow-x-auto"><code>{`-- find the row
select id, name, deleted_at from patients where name ilike '%asha%';

-- restore
update patients set deleted_at = null where id = '<uuid>';`}</code></pre>
              <p>
                Same pattern for <code>products</code>.
              </p>

              <h3 class="text-base font-medium pt-2">Backups</h3>
              <p class="flex items-start gap-2">
                <Wrench class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  Supabase auto-backs-up daily on paid plans. Before any
                  bulk operation (test-data wipe, mass adjustments), take a
                  manual snapshot:{' '}
                  <strong>Database → Backups → Take a backup now</strong>.
                </span>
              </p>

              <h3 class="text-base font-medium pt-2">Migrations</h3>
              <p>
                SQL migrations live in{' '}
                <code class="text-xs bg-muted px-1 rounded">supabase/migrations/</code>{' '}
                in the repo. Apply new ones in order in the SQL Editor. The
                schema is multi-tenant-ready (every row carries{' '}
                <code>clinic_id</code>), so adding a second clinic later is
                operational — no schema change.
              </p>
            </Section>
          )}

          <div class="border-t border-border pt-4 text-xs text-muted-foreground flex items-center gap-2">
            <Users class="size-3" />
            <span>
              Spotted something wrong or missing in this guide? Tell the
              admin and we'll update it.
            </span>
          </div>
        </div>
      </div>
    )
  },
})
