import { defineComponent } from 'vue'
import {
  Users,
  Package,
  ClipboardList,
  ShoppingCart,
  Plus,
  AlertTriangle,
  Sun,
  Moon,
  LogOut,
  Lock,
  Wrench,
  CircleHelp,
} from 'lucide-vue-next'

// In-app help. Plain HTML/Tailwind with anchored sections so non-technical
// staff can read straight through or jump to what they need. Update the
// content here when flows change — it's the canonical user-facing doc.

const sections = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'patients', label: 'Patients' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'visits', label: 'Visits & prescriptions' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
  { id: 'admin', label: 'For admins' },
]

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

export default defineComponent({
  name: 'HelpView',
  setup() {
    return () => (
      <div class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
        {/* TOC */}
        <aside class="lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-auto">
          <div class="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            On this page
          </div>
          <nav class="flex flex-col gap-1 text-sm">
            {sections.map((s) => (
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
              A walkthrough for daily clinic operations — patient records,
              inventory, dispensing, and visit notes. Skim the section you
              need or read straight through.
            </p>
          </header>

          <Section id="getting-started" title="Getting started">
            
                <p>
                  Sign in with the email and password your admin set up for
                  you. After signing in you'll land on the{' '}
                  <strong>Dashboard</strong>. Use the left sidebar to switch
                  between Dashboard, Patients, Inventory, Visits, and this
                  Help page.
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
                  
                      On a phone? Tap the menu icon in the top-left to open
                      the sidebar — it slides out as a drawer on small
                      screens.
                    
                </Note>
              
          </Section>

          <Section id="dashboard" title="Dashboard">
            
                <p>
                  Five cards summarise the state of the clinic right now.
                  Cards stay grey when there's nothing to flag — they light
                  up with colour only when there's something worth your
                  attention.
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
                      Rows read "Tomorrow", "Day after tomorrow", or the
                      actual date.
                    </div>
                  </li>
                  <li class="flex gap-3 items-start">
                    <ShoppingCart class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <strong>Recent sales</strong> — the last 10 products
                      dispensed, with quantity and how long ago.
                    </div>
                  </li>
                </ul>
                <Note kind="info">
                  
                      All five cards load in parallel — if one is slower or
                      erroring, the others still render. A card with an{' '}
                      <span class="text-red-700 dark:text-red-400 font-medium">Error</span>{' '}
                      badge means that query failed — usually a temporary
                      connection blip; refresh the page.
                    
                </Note>
              
          </Section>

          <Section id="patients" title="Patients">
            
                <p>
                  Open <strong>Patients</strong> from the sidebar. The list
                  shows every active patient with their client number,
                  name, and phone. Search at the top filters by name,
                  phone, or client number — type and results update as you
                  go.
                </p>

                <h3 class="text-base font-medium pt-2">Add a patient</h3>
                <ol class="list-decimal pl-5 space-y-1">
                  <li>
                    Click{' '}
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs">
                      <Plus class="size-3" /> New patient
                    </span>{' '}
                    at the top right.
                  </li>
                  <li>
                    Fill in <strong>name</strong> and{' '}
                    <strong>phone</strong> at minimum. Age, gender, email,
                    address, notes are optional.
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
                  Click the patient's row to open their detail page. From
                  there you can <strong>Edit</strong>, <strong>Remove</strong>
                  , or start a <strong>New visit</strong> with this patient
                  pre-selected.
                </p>
                <Note kind="warn">
                  
                      "Remove" is a <strong>soft delete</strong>. The
                      patient stops appearing in lists, but their visit and
                      sales history is preserved. If you remove someone by
                      mistake, ask your admin to restore.
                    
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
                    — stock is at or below its reorder level. Reorder is set
                    per-product on creation/edit.
                  </li>
                </ul>

                <h3 class="text-base font-medium pt-2">Add a product</h3>
                <ol class="list-decimal pl-5 space-y-1">
                  <li>
                    Click <strong>New product</strong>.
                  </li>
                  <li>
                    Name and supplier are required. Category is free-text
                    (e.g.{' '}
                    <code class="text-xs bg-muted px-1 rounded">
                      HAIR SERUMS / MINOXIDIL
                    </code>
                    ) — type a new one or match an existing.
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

                <h3 class="text-base font-medium pt-2">Record stock changes</h3>
                <p>
                  Open a product and use <strong>Record movement</strong>:
                </p>
                <ul class="pl-5 list-disc space-y-1">
                  <li>
                    <strong>Purchase</strong> — new stock arrived (increases stock).
                  </li>
                  <li>
                    <strong>Adjustment in / out</strong> — correct stock counts after
                    physical recount.
                  </li>
                  <li>
                    <strong>Damage</strong> — broken/spoiled units written off.
                  </li>
                  <li>
                    <strong>Expired</strong> — write off batches past their
                    expiry date.
                  </li>
                </ul>
                <Note kind="warn">
                  
                      Movements are <strong>append-only</strong> — once
                      recorded, you can't edit or delete them. If you make a
                      typo, correct it with an{' '}
                      <em>Adjustment</em> entry in the opposite direction.
                      This keeps the audit trail clean.
                    
                </Note>

                <h3 class="text-base font-medium pt-2">Sell / dispense a product</h3>
                <ol class="list-decimal pl-5 space-y-1">
                  <li>
                    On the inventory list, click the{' '}
                    <ShoppingCart class="inline size-3.5 mx-0.5" /> icon on the
                    product's row — or open the product and click <strong>Sell</strong>.
                  </li>
                  <li>
                    Search and pick a patient.
                  </li>
                  <li>
                    Set the quantity. Total is shown live.
                  </li>
                  <li>
                    Click <strong>Sell</strong>. Stock is reduced and a SALE
                    movement is recorded against the patient.
                  </li>
                </ol>
                <Note kind="info">
                  
                      Trying to sell more than available shows a clear "Only N
                      in stock" error — the sale won't go through and stock
                      stays the same. Same protection if two people try to
                      sell the last unit at the same time — exactly one
                      succeeds.
                    
                </Note>
              
          </Section>

          <Section id="visits" title="Visits & prescriptions">
            
                <p>
                  A <strong>visit</strong> is one clinical encounter — notes,
                  treatment, optional prescribed products, and an optional
                  follow-up date.
                </p>

                <h3 class="text-base font-medium pt-2">Record a new visit</h3>
                <ol class="list-decimal pl-5 space-y-1">
                  <li>
                    Open <strong>Visits</strong> → <strong>New visit</strong>.
                    Or, on a patient's detail page, click <strong>New visit</strong>{' '}
                    to skip the patient-picking step.
                  </li>
                  <li>Pick the patient (skipped if pre-filled).</li>
                  <li>
                    Set a <strong>Follow-up date</strong> if the patient
                    needs to come back — this is what populates the
                    dashboard's Today's / Upcoming follow-ups cards.
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
                    . Each line picks a product and a quantity. Subtotal
                    shows live.
                  </li>
                  <li>
                    Click <strong>Save visit</strong>.
                  </li>
                </ol>
                <Note kind="info">
                  
                      Saving a visit with prescribed products{' '}
                      <strong>atomically</strong> creates the visit AND
                      dispenses each product. If any line doesn't have
                      enough stock, the <em>entire</em> visit is rolled back —
                      no partial state. You'll see a toast naming the failing
                      product so you can fix the quantity and retry.
                    
                </Note>

                <h3 class="text-base font-medium pt-2">Browse visit history</h3>
                <p>
                  The Visits page lists all visits newest-first. Click any
                  row to see the full visit detail (notes, treatment,
                  dispensed lines with totals). Or open a patient and scroll
                  to their <strong>Visit history</strong> card.
                </p>
              
          </Section>

          <Section id="troubleshoot" title="Troubleshooting">
            
                <h3 class="text-base font-medium">"Contact admin" screen after login</h3>
                <p>
                  You signed in successfully but you don't have a profile
                  attached to the clinic yet. Ask your admin to run the
                  one-line SQL to onboard your account.
                </p>

                <h3 class="text-base font-medium pt-2">Login keeps failing</h3>
                <ul class="list-disc pl-5 space-y-1">
                  <li>Check the email is correct — case doesn't matter.</li>
                  <li>
                    If you forgot the password, ask your admin to reset it
                    from the Supabase dashboard (no self-service yet).
                  </li>
                  <li>
                    If the page hangs, refresh once with{' '}
                    <Kbd>Cmd</Kbd>+<Kbd>R</Kbd> (Mac) or{' '}
                    <Kbd>Ctrl</Kbd>+<Kbd>R</Kbd> (Windows).
                  </li>
                </ul>

                <h3 class="text-base font-medium pt-2">Dashboard card shows "Error"</h3>
                <p>
                  One query failed — the other cards are still good. Refresh
                  the page. If it stays, tell your admin which card so they
                  can check the database.
                </p>

                <h3 class="text-base font-medium pt-2">
                  Patient / product search returns nothing
                </h3>
                <ul class="list-disc pl-5 space-y-1">
                  <li>
                    Search is by <strong>name</strong>, <strong>phone</strong>,
                    or <strong>client number</strong> for patients; by{' '}
                    <strong>name</strong>, <strong>SKU</strong>, or{' '}
                    <strong>category</strong> for products.
                  </li>
                  <li>
                    Spaces matter — try a shorter substring. Partial matches
                    are fine ("min" finds "minoxidil").
                  </li>
                  <li>
                    Removed (soft-deleted) patients/products are filtered
                    out by design. Ask admin if you need to recover one.
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

          <Section id="admin" title="For admins">
            
                <p class="flex items-start gap-2">
                  <Lock class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span>
                    Onboarding and database operations are intentionally
                    SQL-only for now — there's no admin UI yet. Use the
                    Supabase <strong>SQL Editor</strong>.
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
                  <li>
                    Tell the user to refresh / log in.
                  </li>
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
                  <code class="text-xs bg-muted px-1 rounded">
                    supabase/migrations/
                  </code>{' '}
                  in the repo. Apply new ones in order in the SQL Editor.
                  The schema is multi-tenant-ready (every row carries{' '}
                  <code>clinic_id</code>), so adding a second clinic later
                  is operational — no schema change.
                </p>
              
          </Section>

          <div class="border-t border-border pt-4 text-xs text-muted-foreground flex items-center gap-2">
            <Users class="size-3" />
            <span>
              Spotted something wrong or missing in this guide? Tell the admin and
              we'll update it.
            </span>
          </div>
        </div>
      </div>
    )
  },
})
