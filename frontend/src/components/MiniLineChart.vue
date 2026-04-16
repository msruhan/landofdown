<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

const props = defineProps<{
  labels: string[]
  data: number[]
  color?: string
  height?: number
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.data,
      borderColor: props.color || '#00ff87',
      backgroundColor: (props.color || '#00ff87') + '15',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: props.color || '#00ff87',
      borderWidth: 2,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111a15',
      titleColor: '#e4e4e7',
      bodyColor: '#a1a1aa',
      borderColor: '#1e3a2a',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      display: false,
      grid: { display: false },
    },
    y: {
      display: false,
      grid: { display: false },
    },
  },
}))
</script>

<template>
  <div :style="{ height: (height || 120) + 'px' }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
