import { computed, defineComponent } from 'vue'

const SOON_DAYS = 60

export default defineComponent({
  name: 'ExpiryBadge',
  props: {
    expiryDate: { type: String as () => string | null, default: null },
  },
  setup(props) {
    const status = computed<'expired' | 'soon' | null>(() => {
      if (!props.expiryDate) return null
      const d = new Date(props.expiryDate)
      if (Number.isNaN(d.getTime())) return null
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const days = Math.floor((d.getTime() - today.getTime()) / 86_400_000)
      if (days < 0) return 'expired'
      if (days < SOON_DAYS) return 'soon'
      return null
    })
    return () => {
      if (status.value === 'expired') {
        return (
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-700 dark:text-red-400">
            Expired
          </span>
        )
      }
      if (status.value === 'soon') {
        return (
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400">
            Soon
          </span>
        )
      }
      return null
    }
  },
})
