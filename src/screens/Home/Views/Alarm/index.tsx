import { memo, useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, Switch, View } from 'react-native'
import Section from '../Setting/components/Section'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import CheckBox from '@/components/common/CheckBox'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { updateSetting } from '@/core/common'
import { useSettingValue } from '@/store/setting/hook'
import {
  addAlarmClock,
  createAlarmClock,
  getAlarmClockNextInfo,
  getAlarmRepeatText,
  parseAlarmClocks,
  removeAlarmClocks,
  setAlarmClockEnabled,
  setAlarmClockEnabledBatch,
  skipAlarmClockOnce,
  updateAlarmClock,
  useAlarmClockTimeInfo,
} from '@/core/player/alarmClock'
import { dateFormat } from '@/utils/common'
import { confirmDialog, toast } from '@/utils/tools'
import { openAutoStartSettings } from '@/utils/nativeModules/utils'
import AlarmEditModal, { type AlarmEditModalType } from './AlarmEditModal'
import AlarmDisableModal, { type AlarmDisableModalType } from './AlarmDisableModal'

const formatRemainTime = (time: number) => {
  const h = Math.trunc(time / 3600).toString().padStart(2, '0')
  const m = Math.trunc((time % 3600) / 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const editModalRef = useRef<AlarmEditModalType>(null)
  const disableModalRef = useRef<AlarmDisableModalType>(null)
  const alarmClocksText = useSettingValue('player.alarmClocks')
  const autoStartConfirmed = useSettingValue('player.alarmAutoStartConfirmed')
  const { time, alarmTime } = useAlarmClockTimeInfo()
  const alarms = useMemo(() => parseAlarmClocks(alarmClocksText), [alarmClocksText])
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const clearBatchMode = () => {
    setBatchMode(false)
    setSelectedIds([])
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item != id) : [...prev, id])
  }

  const ensureAutoStartPrompt = async() => {
    if (autoStartConfirmed) return
    const confirm = await confirmDialog({
      title: t('alarm_clock_autostart_title'),
      message: t('alarm_clock_autostart_desc'),
      cancelButtonText: t('later'),
      confirmButtonText: t('alarm_clock_go_autostart'),
    })
    if (!confirm) return
    const opened = await openAutoStartSettings()
    if (!opened) {
      toast(t('alarm_clock_autostart_open_failed'))
      return
    }
    updateSetting({ 'player.alarmAutoStartConfirmed': true })
  }

  const handleToggleAlarm = async(alarm: LX.AlarmClock.Item, enabled: boolean) => {
    if (enabled) {
      await setAlarmClockEnabled(alarm.id, true)
      void ensureAutoStartPrompt()
      return
    }

    if (alarm.repeat == 'once') {
      await setAlarmClockEnabled(alarm.id, false)
      return
    }

    const nextInfo = await getAlarmClockNextInfo(alarm)
    disableModalRef.current?.show({
      dateText: nextInfo ? dateFormat(nextInfo.timestamp, 'M-D') : alarm.time,
      onSkip: async() => {
        await skipAlarmClockOnce(alarm.id)
      },
      onDisable: async() => {
        await setAlarmClockEnabled(alarm.id, false)
      },
    })
  }

  const handleSaveAlarm = async(alarm: LX.AlarmClock.Item) => {
    if (alarms.some(item => item.id == alarm.id)) await updateAlarmClock(alarm.id, alarm)
    else await addAlarmClock(alarm)
    if (alarm.enabled) void ensureAutoStartPrompt()
  }

  const renderHeader = () => (
    <>
      <View style={{ ...styles.topCard, backgroundColor: theme['c-content-background'], borderColor: theme['c-primary-alpha-600'] }}>
        <View style={styles.topCardRow}>
          <Text size={17}>{t('alarm_clock_next_title')}</Text>
          <Button onPress={() => { batchMode ? clearBatchMode() : setBatchMode(true) }}>
            <Text color={theme['c-primary']}>{batchMode ? t('done') : t('alarm_clock_batch_manage')}</Text>
          </Button>
        </View>
        {time >= 0 ? (
          <>
            <Text size={26} color={theme['c-primary']} style={styles.topCardMain}>{alarmTime}</Text>
            <Text color={theme['c-font-label']}>{t('alarm_clock_tip_remain_short', { time: formatRemainTime(time) })}</Text>
          </>
        ) : (
          <Text color={theme['c-font-label']}>{t('alarm_clock_next_empty')}</Text>
        )}
      </View>

      {!autoStartConfirmed && alarms.some(item => item.enabled) ? (
        <View style={{ ...styles.noticeCard, backgroundColor: theme['c-primary-light-100-alpha-100'] }}>
          <Text>{t('alarm_clock_autostart_notice')}</Text>
          <Button style={styles.noticeBtn} onPress={() => { void ensureAutoStartPrompt() }}>
            <Text color={theme['c-primary']}>{t('alarm_clock_go_autostart')}</Text>
          </Button>
        </View>
      ) : null}
    </>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={alarms}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <Section title={t('nav_alarm')}>
            {renderHeader()}
          </Section>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text color={theme['c-font-label']}>{t('alarm_clock_empty')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          return (
            <Button
              style={{ ...styles.listItem, backgroundColor: theme['c-content-background'] }}
              onPress={() => {
                if (batchMode) {
                  handleToggleSelect(item.id)
                  return
                }
                editModalRef.current?.show(item)
              }}
            >
              <View style={styles.itemLeft}>
                {batchMode ? (
                  <View style={styles.batchCheck}>
                    <CheckBox
                      check={selectedIdSet.has(item.id)}
                      onChange={() => { handleToggleSelect(item.id) }}
                    />
                  </View>
                ) : null}
                <View>
                  <Text size={24}>{item.time}</Text>
                  <Text color={theme['c-font-label']}>{getAlarmRepeatText(item.repeat)}</Text>
                </View>
              </View>
              {batchMode ? null : (
                <Switch
                  value={item.enabled}
                  trackColor={{ false: theme['c-400'], true: theme['c-primary-alpha-600'] }}
                  thumbColor={item.enabled ? theme['c-primary'] : theme['c-button-font']}
                  onValueChange={value => { void handleToggleAlarm(item, value) }}
                />
              )}
            </Button>
          )
        }}
      />

      {batchMode ? (
        <View style={{ ...styles.batchBar, backgroundColor: theme['c-content-background'] }}>
          <Button
            style={{ ...styles.batchBtn, backgroundColor: theme['c-button-background'] }}
            disabled={!selectedIds.length}
            onPress={() => {
              void setAlarmClockEnabledBatch(selectedIds, true).then(() => {
                clearBatchMode()
                void ensureAutoStartPrompt()
              })
            }}
          >
            <Text style={styles.batchBtnText} color={theme['c-button-font']}>{t('alarm_clock_batch_enable')}</Text>
          </Button>
          <Button
            style={{ ...styles.batchBtn, backgroundColor: theme['c-button-background'] }}
            disabled={!selectedIds.length}
            onPress={() => { void setAlarmClockEnabledBatch(selectedIds, false).then(clearBatchMode) }}
          >
            <Text style={styles.batchBtnText} color={theme['c-button-font']}>{t('alarm_clock_batch_disable')}</Text>
          </Button>
          <Button
            style={{ ...styles.batchBtn, backgroundColor: theme['c-primary'] }}
            disabled={!selectedIds.length}
            onPress={() => { void removeAlarmClocks(selectedIds).then(clearBatchMode) }}
          >
            <Text style={styles.batchBtnText} color={theme['c-primary-light-1000']}>{t('delete')}</Text>
          </Button>
        </View>
      ) : null}

      {!batchMode ? (
        <Button
          style={{ ...styles.fab, backgroundColor: theme['c-primary'] }}
          onPress={() => { editModalRef.current?.show(createAlarmClock()) }}
        >
          <Text size={28} color={theme['c-primary-light-1000']}>+</Text>
        </Button>
      ) : null}

      <AlarmEditModal ref={editModalRef} onSave={handleSaveAlarm} />
      <AlarmDisableModal ref={disableModalRef} />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  topCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topCardMain: {
    marginBottom: 4,
  },
  noticeCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    padding: 14,
  },
  noticeBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 40,
  },
  listItem: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  batchCheck: {
    marginRight: 10,
  },
  batchBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
  },
  batchBtn: {
    flex: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  batchBtnText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
