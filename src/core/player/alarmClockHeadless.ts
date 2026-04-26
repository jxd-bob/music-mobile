import init from '@/core/init'
import { bootLog } from '@/utils/bootLog'

export const runAlarmClockHeadlessTask = async(event: { timestamp?: number } = {}) => {
  global.lx.isHeadlessTaskRunning = true
  try {
    bootLog(`Alarm headless task start. ts=${String(event.timestamp ?? 0)}`)
    await init()
    bootLog('Alarm headless task finish.')
  } finally {
    global.lx.isHeadlessTaskRunning = false
  }
}
