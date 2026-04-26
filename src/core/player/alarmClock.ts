import { useEffect, useState } from 'react'
import { getListMusics } from '@/core/list'
import { playListWithoutPrompt } from '@/core/player/player'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { updateSetting } from '@/core/common'
import { LIST_IDS } from '@/config/constant'
import { dateFormat, getRandom } from '@/utils/common'
import { toast } from '@/utils/tools'
import { setVolume } from '@/plugins/player'
import {
  cancelNativeAlarmClock,
  consumePendingAlarmClockTrigger,
  onAlarmClockTrigger,
  scheduleNativeAlarmClock,
} from '@/utils/nativeModules/utils'
import { isLegalWorkday, preloadLegalHolidayYears } from './legalHoliday'

type Hook = (time: number, alarmTime: string) => void
type AlarmRepeat = LX.AlarmClock.Repeat
type AlarmSource = LX.AlarmClock.Source

const rxp = /^(\d{1,2}):(\d{2})$/
const DAY_MS = 24 * 3600 * 1000

const parseAlarmTime = (time: string) => {
  const result = rxp.exec(time.trim())
  if (!result) return null
  const hour = parseInt(result[1])
  const minute = parseInt(result[2])
  if (hour > 23 || minute > 59) return null
  return {
    hour,
    minute,
    time: `${result[1].padStart(2, '0')}:${result[2]}`,
  }
}

const formatDateKey = (date: Date) => dateFormat(date, 'Y-M-D')

const createAlarmId = () => `alarm_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

const sanitizeAlarm = (alarm: Partial<LX.AlarmClock.Item> | null | undefined): LX.AlarmClock.Item | null => {
  if (!alarm) return null
  const parsed = typeof alarm.time == 'string' ? parseAlarmTime(alarm.time) : null
  if (!parsed) return null
  return {
    id: typeof alarm.id == 'string' && alarm.id ? alarm.id : createAlarmId(),
    time: parsed.time,
    enabled: !!alarm.enabled,
    repeat: alarm.repeat ?? 'once',
    source: alarm.source ?? 'love',
    applyVolume: !!alarm.applyVolume,
    volume: typeof alarm.volume == 'number' ? Math.max(0, Math.min(1, alarm.volume)) : 0.8,
    skipDates: Array.isArray(alarm.skipDates) ? alarm.skipDates.filter((item): item is string => typeof item == 'string') : [],
  }
}

const sortAlarms = (alarms: LX.AlarmClock.Item[]) => {
  return [...alarms].sort((a, b) => {
    const timeCompare = a.time.localeCompare(b.time)
    if (timeCompare) return timeCompare
    return a.id.localeCompare(b.id)
  })
}

export const parseAlarmClocks = (value?: string | null): LX.AlarmClock.Item[] => {
  if (!value) return []
  try {
    const list = JSON.parse(value) as Array<Partial<LX.AlarmClock.Item>>
    if (!Array.isArray(list)) return []
    return sortAlarms(list.map(item => sanitizeAlarm(item)).filter((item): item is LX.AlarmClock.Item => !!item))
  } catch {
    return []
  }
}

const serializeAlarmClocks = (alarms: LX.AlarmClock.Item[]) => JSON.stringify(sortAlarms(alarms))

export const getAlarmClocks = () => parseAlarmClocks(settingState.setting['player.alarmClocks'])

export const createAlarmClock = (partial: Partial<LX.AlarmClock.Item> = {}): LX.AlarmClock.Item => {
  return sanitizeAlarm({
    id: partial.id ?? createAlarmId(),
    time: partial.time ?? settingState.setting['player.alarmClock'] ?? '07:30',
    enabled: partial.enabled ?? true,
    repeat: partial.repeat ?? settingState.setting['player.alarmRepeat'],
    source: partial.source ?? settingState.setting['player.alarmSource'],
    applyVolume: partial.applyVolume ?? settingState.setting['player.alarmApplyVolume'],
    volume: partial.volume ?? settingState.setting['player.alarmVolume'],
    skipDates: partial.skipDates ?? [],
  })!
}

const matchRepeat = async(date: Date, repeat: AlarmRepeat) => {
  switch (repeat) {
    case 'everyday':
    case 'once':
      return true
    case 'workday':
      return isLegalWorkday(date)
    case 'weekend':
      return [0, 6].includes(date.getDay())
    default:
      return false
  }
}

const getNextTimestampByRepeat = async(alarm: LX.AlarmClock.Item, baseTime = Date.now()) => {
  const parsed = parseAlarmTime(alarm.time)
  if (!parsed) return null
  const now = new Date(baseTime)

  for (let i = 0; i < 400; i++) {
    const target = new Date(now.getTime() + i * DAY_MS)
    target.setHours(parsed.hour, parsed.minute, 0, 0)
    if (target.getTime() <= now.getTime()) continue
    if (alarm.skipDates.includes(formatDateKey(target))) continue
    if (!(await matchRepeat(target, alarm.repeat))) continue
    return {
      alarm,
      time: parsed.time,
      timestamp: target.getTime(),
      dateKey: formatDateKey(target),
    } satisfies LX.AlarmClock.NextInfo
  }
  return null
}

export const getAlarmClockNextInfo = async(alarm: LX.AlarmClock.Item, baseTime = Date.now()) => {
  if (!alarm.enabled) return null
  return getNextTimestampByRepeat(alarm, baseTime)
}

export const getNearestAlarmClockInfo = async(alarms = getAlarmClocks()) => {
  let nearestInfo: LX.AlarmClock.NextInfo | null = null
  for (const alarm of alarms) {
    const nextInfo = await getAlarmClockNextInfo(alarm)
    if (!nextInfo) continue
    if (!nearestInfo || nextInfo.timestamp < nearestInfo.timestamp) nearestInfo = nextInfo
  }
  return nearestInfo
}

const alarmTools = {
  timeout: null as ReturnType<typeof setInterval> | null,
  targetTimestamp: 0,
  alarmTime: '',
  timeHooks: [] as Hook[],
  isTriggering: false,
  isRuntimeInited: false,
  lastTriggerTimestamp: 0,
  getTime() {
    if (!this.targetTimestamp) return -1
    return Math.max(Math.round((this.targetTimestamp - Date.now()) / 1000), -1)
  },
  callHooks() {
    const time = this.getTime()
    for (const hook of this.timeHooks) hook(time, this.alarmTime)
  },
  clearTimer() {
    if (this.timeout) {
      clearInterval(this.timeout)
      this.timeout = null
    }
  },
  clear() {
    this.clearTimer()
    this.targetTimestamp = 0
    this.alarmTime = ''
    this.callHooks()
  },
  async syncNativeSchedule(targetTimestamp: number, alarmTime: string) {
    await scheduleNativeAlarmClock(targetTimestamp, alarmTime)
  },
  async cancelNativeSchedule() {
    await cancelNativeAlarmClock()
  },
  start(alarmTime: string, targetTimestamp: number) {
    this.clearTimer()
    this.alarmTime = alarmTime
    this.targetTimestamp = targetTimestamp
    this.timeout = setInterval(() => {
      this.callHooks()
    }, 1000)
    this.callHooks()
  },
  addTimeHook(hook: Hook) {
    this.timeHooks.push(hook)
    hook(this.getTime(), this.alarmTime)
  },
  removeTimeHook(hook: Hook) {
    const index = this.timeHooks.indexOf(hook)
    if (index > -1) this.timeHooks.splice(index, 1)
  },
  async triggerBySource(source: AlarmSource): Promise<void> {
    let listId: string = LIST_IDS.LOVE
    switch (source) {
      case 'current':
        listId = playerState.playInfo.playerListId ?? LIST_IDS.LOVE
        break
      case 'love':
      default:
        listId = LIST_IDS.LOVE
        break
    }
    const list = listId ? await getListMusics(listId) : []
    if (!list.length) {
      if (source == 'current') return this.triggerBySource('love')
      toast(global.i18n.t('alarm_clock_empty_list_tip'))
      return
    }
    const index = getRandom(0, list.length)
    await playListWithoutPrompt(listId, index)
    toast(global.i18n.t('alarm_clock_ring_tip'))
  },
}

const updateLegacyAlarmState = (alarms: LX.AlarmClock.Item[], nextInfo: LX.AlarmClock.NextInfo | null) => {
  if (nextInfo) {
    updateSetting({
      'player.alarmClocks': serializeAlarmClocks(alarms),
      'player.alarmEnable': alarms.some(alarm => alarm.enabled),
      'player.alarmClock': nextInfo.time,
      'player.alarmClockTimestamp': String(nextInfo.timestamp),
      'player.alarmRepeat': nextInfo.alarm.repeat,
      'player.alarmSource': nextInfo.alarm.source,
      'player.alarmApplyVolume': nextInfo.alarm.applyVolume,
      'player.alarmVolume': nextInfo.alarm.volume,
    })
    return
  }

  updateSetting({
    'player.alarmClocks': serializeAlarmClocks(alarms),
    'player.alarmEnable': false,
    'player.alarmClockTimestamp': '',
  })
}

export const syncAlarmClockState = async(alarms = getAlarmClocks()) => {
  const nextInfo = await getNearestAlarmClockInfo(alarms)
  updateLegacyAlarmState(alarms, nextInfo)

  if (!nextInfo) {
    alarmTools.clear()
    await alarmTools.cancelNativeSchedule()
    return null
  }

  alarmTools.start(nextInfo.time, nextInfo.timestamp)
  await alarmTools.syncNativeSchedule(nextInfo.timestamp, nextInfo.time)
  return nextInfo
}

const saveAlarmClockList = async(alarms: LX.AlarmClock.Item[]) => {
  const newAlarms = sortAlarms(alarms)
  await syncAlarmClockState(newAlarms)
  return newAlarms
}

const findTriggeredAlarm = async(timestamp: number, alarms: LX.AlarmClock.Item[]) => {
  const baseTime = timestamp - 1000
  for (const alarm of alarms) {
    const nextInfo = await getAlarmClockNextInfo(alarm, baseTime)
    if (!nextInfo) continue
    if (Math.abs(nextInfo.timestamp - timestamp) < 60 * 1000) return nextInfo
  }
  return null
}

export const initAlarmClockRuntime = () => {
  if (alarmTools.isRuntimeInited) return
  alarmTools.isRuntimeInited = true

  onAlarmClockTrigger(({ timestamp }) => {
    void triggerAlarmClock(timestamp)
  })
}

export const syncAlarmClockCalendar = async() => {
  const now = new Date()
  await preloadLegalHolidayYears([now.getFullYear(), now.getFullYear() + 1])
}

export const handlePendingAlarmClockTrigger = async() => {
  const pending = await consumePendingAlarmClockTrigger()
  if (!pending) return
  await triggerAlarmClock(pending.timestamp)
}

export const triggerAlarmClock = async(timestamp?: number) => {
  if (alarmTools.isTriggering) return
  if (timestamp) {
    if (alarmTools.lastTriggerTimestamp == timestamp) return
    alarmTools.lastTriggerTimestamp = timestamp
  }
  alarmTools.isTriggering = true

  try {
    const alarms = getAlarmClocks()
    const triggeredInfo = timestamp ? await findTriggeredAlarm(timestamp, alarms) : await getNearestAlarmClockInfo(alarms)
    if (!triggeredInfo) {
      await syncAlarmClockState(alarms)
      return
    }

    const nextAlarms = alarms.map(alarm => {
      if (alarm.id != triggeredInfo.alarm.id) return alarm
      if (alarm.repeat == 'once') return { ...alarm, enabled: false }
      return alarm
    })

    if (triggeredInfo.alarm.applyVolume) {
      await setVolume(triggeredInfo.alarm.volume)
      updateSetting({ 'player.volume': triggeredInfo.alarm.volume })
    }

    await saveAlarmClockList(nextAlarms)
    await alarmTools.triggerBySource(triggeredInfo.alarm.source)
  } finally {
    alarmTools.isTriggering = false
  }
}

export const addAlarmClock = async(partial: Partial<LX.AlarmClock.Item> = {}) => {
  const alarms = getAlarmClocks()
  const alarm = createAlarmClock(partial)
  await saveAlarmClockList([...alarms, alarm])
  return alarm
}

export const updateAlarmClock = async(id: string, patch: Partial<LX.AlarmClock.Item>) => {
  const alarms = getAlarmClocks()
  const nextAlarms = alarms.map(alarm => alarm.id == id ? createAlarmClock({ ...alarm, ...patch, id }) : alarm)
  await saveAlarmClockList(nextAlarms)
  return nextAlarms.find(alarm => alarm.id == id) ?? null
}

export const removeAlarmClock = async(id: string) => {
  const alarms = getAlarmClocks().filter(alarm => alarm.id != id)
  await saveAlarmClockList(alarms)
}

export const removeAlarmClocks = async(ids: string[]) => {
  const alarmIdSet = new Set(ids)
  const alarms = getAlarmClocks().filter(alarm => !alarmIdSet.has(alarm.id))
  await saveAlarmClockList(alarms)
}

export const setAlarmClockEnabled = async(id: string, enabled: boolean) => {
  return updateAlarmClock(id, { enabled })
}

export const setAlarmClockEnabledBatch = async(ids: string[], enabled: boolean) => {
  const alarmIdSet = new Set(ids)
  const alarms = getAlarmClocks().map(alarm => alarmIdSet.has(alarm.id) ? { ...alarm, enabled } : alarm)
  await saveAlarmClockList(alarms)
}

export const skipAlarmClockOnce = async(id: string) => {
  const alarms = getAlarmClocks()
  const alarm = alarms.find(item => item.id == id)
  if (!alarm || alarm.repeat == 'once') return null
  const nextInfo = await getAlarmClockNextInfo(alarm)
  if (!nextInfo) return null
  const nextAlarms = alarms.map(item => item.id == id
    ? { ...item, skipDates: Array.from(new Set([...item.skipDates, nextInfo.dateKey])) }
    : item)
  await saveAlarmClockList(nextAlarms)
  return nextInfo
}

export const restoreAlarmClock = async() => {
  void syncAlarmClockCalendar()
  await syncAlarmClockState(getAlarmClocks())
}

export const canScheduleAlarmClock = async() => {
  return (await getListMusics(LIST_IDS.LOVE)).length > 0
}

export const useAlarmClockTimeInfo = () => {
  const [info, setInfo] = useState({ time: -1, alarmTime: '' })
  useEffect(() => {
    const hook: Hook = (time, alarmTime) => {
      setInfo({ time, alarmTime })
    }
    alarmTools.addTimeHook(hook)
    return () => {
      alarmTools.removeTimeHook(hook)
    }
  }, [])
  return info
}

export const onAlarmClockUpdate = (handler: Hook) => {
  alarmTools.addTimeHook(handler)
  return () => {
    alarmTools.removeTimeHook(handler)
  }
}

export const getAlarmRepeatText = (repeat: AlarmRepeat) => {
  switch (repeat) {
    case 'everyday':
      return global.i18n.t('alarm_clock_repeat_everyday')
    case 'workday':
      return global.i18n.t('alarm_clock_repeat_workday')
    case 'weekend':
      return global.i18n.t('alarm_clock_repeat_weekend')
    case 'once':
    default:
      return global.i18n.t('alarm_clock_repeat_once')
  }
}

export const updateAlarmClockConfig = async(setting: Partial<Pick<LX.AppSetting, 'player.alarmEnable'
| 'player.alarmClock'
| 'player.alarmRepeat'
| 'player.alarmSource'
| 'player.alarmApplyVolume'
| 'player.alarmVolume'>>) => {
  const alarms = getAlarmClocks()
  const currentAlarm = alarms[0] ?? createAlarmClock()
  const nextAlarm = createAlarmClock({
    ...currentAlarm,
    enabled: setting['player.alarmEnable'] ?? currentAlarm.enabled,
    time: setting['player.alarmClock'] ?? currentAlarm.time,
    repeat: setting['player.alarmRepeat'] ?? currentAlarm.repeat,
    source: setting['player.alarmSource'] ?? currentAlarm.source,
    applyVolume: setting['player.alarmApplyVolume'] ?? currentAlarm.applyVolume,
    volume: setting['player.alarmVolume'] ?? currentAlarm.volume,
  })
  if (!alarms.length) {
    await saveAlarmClockList([nextAlarm])
    return nextAlarm
  }
  return updateAlarmClock(currentAlarm.id, nextAlarm)
}
