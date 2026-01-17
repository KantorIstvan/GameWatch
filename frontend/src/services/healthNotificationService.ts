import { toast } from 'react-toastify'
import { HealthSettings } from './healthApi'

class HealthNotificationService {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private settings: HealthSettings | null = null

  setSettings(settings: HealthSettings) {
    this.settings = settings
  }

  startSession() {
    this.stopAllReminders()

    if (!this.settings || !this.settings.notificationsEnabled) {
      return
    }

    // Schedule break reminder
    if (this.settings.breakReminderEnabled && this.settings.breakIntervalMinutes) {
      this.scheduleReminder(
        'break',
        this.settings.breakIntervalMinutes * 60 * 1000,
        () => {
          this.showBreakReminder()
          // Reschedule for next break
          if (this.settings?.breakReminderEnabled) {
            this.scheduleReminder(
              'break',
              this.settings.breakIntervalMinutes! * 60 * 1000,
              () => this.showBreakReminder()
            )
          }
        }
      )
    }

    // Schedule hydration reminder
    if (this.settings.hydrationReminderEnabled && this.settings.hydrationIntervalMinutes) {
      this.scheduleReminder(
        'hydration',
        this.settings.hydrationIntervalMinutes * 60 * 1000,
        () => {
          this.showHydrationReminder()
          // Reschedule for next hydration
          if (this.settings?.hydrationReminderEnabled) {
            this.scheduleReminder(
              'hydration',
              this.settings.hydrationIntervalMinutes! * 60 * 1000,
              () => this.showHydrationReminder()
            )
          }
        }
      )
    }

    // Schedule stand reminder
    if (this.settings.standReminderEnabled && this.settings.standIntervalMinutes) {
      this.scheduleReminder(
        'stand',
        this.settings.standIntervalMinutes * 60 * 1000,
        () => {
          this.showStandReminder()
          // Reschedule for next stand
          if (this.settings?.standReminderEnabled) {
            this.scheduleReminder(
              'stand',
              this.settings.standIntervalMinutes! * 60 * 1000,
              () => this.showStandReminder()
            )
          }
        }
      )
    }
  }

  stopAllReminders() {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
  }

  private scheduleReminder(key: string, delayMs: number, callback: () => void) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
    }

    // Schedule new timer
    const timer = setTimeout(callback, delayMs)
    this.timers.set(key, timer)
  }

  private showBreakReminder() {
    const playSound = this.settings?.soundsEnabled

    toast.info('⏸️ Time for a break! Take a few minutes to rest your eyes.', {
      autoClose: 10000,
      pauseOnHover: true,
      draggable: true,
      onClick: () => {
        // User acknowledged the break
      },
    })

    if (playSound) {
      this.playNotificationSound()
    }
  }

  private showHydrationReminder() {
    const playSound = this.settings?.soundsEnabled

    toast.info('💧 Stay hydrated! Grab a glass of water.', {
      autoClose: 8000,
      pauseOnHover: true,
      draggable: true,
    })

    if (playSound) {
      this.playNotificationSound()
    }
  }

  private showStandReminder() {
    const playSound = this.settings?.soundsEnabled

    toast.info('🧘 Time to stand up and stretch!', {
      autoClose: 8000,
      pauseOnHover: true,
      draggable: true,
    })

    if (playSound) {
      this.playNotificationSound()
    }
  }

  showGoalReached(type: 'hours' | 'sessions', current: number, max: number) {
    if (!this.settings?.goalNotificationsEnabled) {
      return
    }

    const message =
      type === 'hours'
        ? `⚠️ Daily goal reached! You've played ${current.toFixed(1)} hours (limit: ${max} hours)`
        : `⚠️ Daily goal reached! You've had ${current} sessions (limit: ${max} sessions)`

    toast.warning(message, {
      autoClose: 15000,
      pauseOnHover: true,
      draggable: true,
    })

    if (this.settings?.soundsEnabled) {
      this.playNotificationSound()
    }
  }

  showGoalExceeded(type: 'hours' | 'sessions', current: number, max: number) {
    if (!this.settings?.goalNotificationsEnabled) {
      return
    }

    const message =
      type === 'hours'
        ? `🚨 Daily limit exceeded! You've played ${current.toFixed(1)} hours (limit: ${max} hours)`
        : `🚨 Daily limit exceeded! You've had ${current} sessions (limit: ${max} sessions)`

    toast.error(message, {
      autoClose: false, // Don't auto-close for exceeded goals
      pauseOnHover: true,
      draggable: true,
    })

    if (this.settings?.soundsEnabled) {
      this.playNotificationSound()
    }
  }

  showLateNightWarning() {
    if (!this.settings?.notificationsEnabled) {
      return
    }

    toast.warning('🌙 Late night gaming detected. Consider taking a break for better sleep.', {
      autoClose: 12000,
      pauseOnHover: true,
      draggable: true,
    })

    if (this.settings?.soundsEnabled) {
      this.playNotificationSound()
    }
  }

  private playNotificationSound() {
    // Play a subtle notification sound
    // You can use the Web Audio API or an audio file
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVKvi7q1aFQg+ldb0xnMpBSd+zPDakz0JE12y6OyrWBUIQ5rZ8sFuIwQ1jtLyzn0vBSF4yO/clkILD1Ov5O+2ZxwGN4/T8sdzKgUme8vv35lFDBBZr+Lpq1cWCT+Y2PLDciMENYrT8dCBMQYfb8Lv45lIDQ9UrOTvsmMcBjSO0fLKdykFJHfG79qUQAwQV6zj7q5bFgo+mtnzw3IkBTOH0fPVgjMFHm3C7+SaSQ4PU6vk7rJkHAU2jNLzy3YrBSR1xe/blEENEFes4+6uXBYKPpbX88V0KgUmeMbw3JZDCxJctujrsVoUBz2R1vTHdSoFJ3fG8NyXQwwSXLLp67JbFAg7j9Pzyn0wBiBuwu/kmkoOEFKp4u+zZhwFMobQ88t3KwUjdMTv25RBDRBWquPvr10WCj2U1vPGdSoFJnfG8N+YRAwTXLHo67FbFQc7jdPzyH4wBR9rwO/knUwPEVGl4vCzaBwFMIPP8st4LQUjccTv25VCDhFVqu7vsV0XCzyS1PTIdSsFJnXE79uWQw0RVqnk77JeFgk7kNLzyn4wBh9pv+7knEsOEE+i4fCxZhwFMIHO8sx4LgUhb8Pv3JVCDhBUqOTurVwVCTuO0vLKfS8FH2u/7uScTQ8RUKPi8LFmGwQud8Tv25VDDRBSpujurVwWCTmL0PLMeC4FH2m+7uOaTADRUaPi8LFmGwQud8Tv3JVCDRBSqOjurVwWCTmL0PLKfC8GH2e87uOZSw4PTqDh77NnGwQtdc7w25VCDRBRp+jurVsWCTeJ0fLLeDEFH2W87uKZSw4PTJ7h8LRnGwQscs7x3JZDDRBQpuLwrVsVCjWH0PLMeTQFHmS67eOYSw4PS5/h8LRoHQYrcc/x3JZDDBFOpeLvq1oUCDSF0PPNeTQFHmS56+CYSw4PSpzh8LNoHQYpb83x3JVCDBBOpeLvq1oVCTGCz/PMezYGHWG46eCXSg4OSpvg8LBnHAYobcvw3ZVDDRBMouLvq1oVCDCAzvTOfDcGHF+36d+XSg4PR5rg8K9lGwUmbMvw3ZVDDRBLoeHwrFkUBzB+zfPPfTcGHF226d+WSQ4PR5rg8K9kGwUmasvx35ZDDRBLoeHwrFkUBzB+zfPOfTcGHF226d+WSQ4PRZng8K5jGgYkacrw35ZDDRBJoODwq1cUBi980PPPfTYGG1y06d+WSQ4PRZng8K5jGgYkacrw35ZDDRBJoODwq1cUBi980PPOfTYGG1y06d+WSQ4PR5jg8K5jGgYkasvx4JdEDBFIoOHwrloUBy99zvPQfjkHG1u06N+USQ4OR5ff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg4PSJff8K5iGQYkacrw4JZCDBBIoOHwrloUBi990PPQfTkHGly15+CUSg==')
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignore errors if sound fails to play
      })
    } catch (error) {
      // Ignore errors
    }
  }
}

// Export singleton instance
export const healthNotificationService = new HealthNotificationService()
export default healthNotificationService
