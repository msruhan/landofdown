import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarOpen = ref(true)
  const globalLoading = ref(false)
  const mobileMenuOpen = ref(false)

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function toggleMobileMenu() {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }

  function closeMobileMenu() {
    mobileMenuOpen.value = false
  }

  function setGlobalLoading(val: boolean) {
    globalLoading.value = val
  }

  return { sidebarOpen, globalLoading, mobileMenuOpen, toggleSidebar, toggleMobileMenu, closeMobileMenu, setGlobalLoading }
})
