declare module 'cal-heatmap' {
  export default class CalHeatmap {
    paint(options: any, plugins?: any[]): void
    destroy(): void
  }
}

declare module 'cal-heatmap/plugins/Tooltip' {
  const Tooltip: any
  export default Tooltip
}

declare module 'cal-heatmap/plugins/LegendLite' {
  const LegendLite: any
  export default LegendLite
}
