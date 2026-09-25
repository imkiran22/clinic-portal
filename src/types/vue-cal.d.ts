// vue-cal 4.x ships no type declarations. We only use it from
// AppointmentsCalendar.tsx, which narrows the payloads it reads.
declare module 'vue-cal' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const VueCal: DefineComponent<Record<string, any>, object, any>
  export default VueCal
}
