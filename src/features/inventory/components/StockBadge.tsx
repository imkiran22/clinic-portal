import { defineComponent } from 'vue'

export default defineComponent({
  name: 'StockBadge',
  props: {
    current: { type: Number, required: true },
    reorderLevel: { type: Number, default: 0 },
  },
  setup(props) {
    return () => {
      if (props.current <= 0) {
        return (
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive">
            Out
          </span>
        )
      }
      if (props.reorderLevel > 0 && props.current <= props.reorderLevel) {
        return (
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400">
            Low
          </span>
        )
      }
      return null
    }
  },
})
