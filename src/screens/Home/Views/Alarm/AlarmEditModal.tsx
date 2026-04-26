import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type ForwardedRef } from 'react'
import { ScrollView, View } from 'react-native'
import DatePicker from 'react-native-date-picker'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Button from '@/components/common/Button'
import CheckBoxItem from '../Setting/components/CheckBoxItem'
import Slider from '@/components/common/Slider'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n, type Message } from '@/lang'
import { createAlarmClock } from '@/core/player/alarmClock'
import { useSettingValue } from '@/store/setting/hook'

const formatNum = (num: number) => String(num).padStart(2, '0')

const parseTimeToDate = (time: string) => {
  const [hour = '07', minute = '30'] = time.split(':')
  const date = new Date()
  date.setHours(Math.min(Math.max(parseInt(hour) || 0, 0), 23))
  date.setMinutes(Math.min(Math.max(parseInt(minute) || 0, 0), 59))
  date.setSeconds(0)
  date.setMilliseconds(0)
  return date
}

const localeMap: Record<NonNullable<LX.AppSetting['common.langId']>, string> = {
  zh_cn: 'zh-CN',
  zh_tw: 'zh-TW',
  en_us: 'en-US',
}

const repeatList: Array<{ id: LX.AlarmClock.Repeat, label: keyof Message }> = [
  { id: 'once', label: 'alarm_clock_repeat_once' },
  { id: 'everyday', label: 'alarm_clock_repeat_everyday' },
  { id: 'workday', label: 'alarm_clock_repeat_workday' },
  { id: 'weekend', label: 'alarm_clock_repeat_weekend' },
]

const sourceList: Array<{ id: LX.AlarmClock.Source, label: keyof Message }> = [
  { id: 'love', label: 'alarm_clock_source_love' },
  { id: 'current', label: 'alarm_clock_source_current' },
]

export interface AlarmEditModalType {
  show: (alarm?: LX.AlarmClock.Item | null) => void
  hide: () => void
}

interface Props {
  onSave: (alarm: LX.AlarmClock.Item) => void | Promise<void>
}

const AlarmEditModal = ({ onSave }: Props, ref: ForwardedRef<AlarmEditModalType>) => {
  const dialogRef = useRef<DialogType>(null)
  const theme = useTheme()
  const t = useI18n()
  const langId = useSettingValue('common.langId')
  const [showMore, setShowMore] = useState(false)
  const [draft, setDraft] = useState<LX.AlarmClock.Item>(createAlarmClock())

  useImperativeHandle(ref, () => ({
    show(alarm?: LX.AlarmClock.Item | null) {
      setShowMore(false)
      setDraft(createAlarmClock(alarm ?? { enabled: true }))
      dialogRef.current?.setVisible(true)
    },
    hide() {
      dialogRef.current?.setVisible(false)
    },
  }))

  const pickerDate = useMemo(() => parseTimeToDate(draft.time), [draft.time])
  const pickerLocale = localeMap[langId ?? 'en_us']

  const updateTime = (nextHour: string, nextMinute: string) => {
    setDraft(prev => ({ ...prev, time: `${nextHour}:${nextMinute}` }))
  }

  const handleTimeChange = (date: Date) => {
    updateTime(formatNum(date.getHours()), formatNum(date.getMinutes()))
  }

  const handleSave = () => {
    void onSave(draft)
    dialogRef.current?.setVisible(false)
  }

  return (
    <Dialog ref={dialogRef} title={t('alarm_clock_edit_title')} closeBtn={true}>
      <View style={styles.contentArea}>
        {!showMore ? (
          <View style={styles.modalContent}>
            <View style={styles.timeHeader}>
              <Text color={theme['c-font-label']}>{t('alarm_clock_time_title')}</Text>
            </View>
            <View style={styles.timePanel}>
              <Text style={styles.timePreview} size={26} color={theme['c-primary']}>{draft.time}</Text>
              <DatePicker
                date={pickerDate}
                mode="time"
                locale={pickerLocale}
                is24hourSource="locale"
                onDateChange={handleTimeChange}
                dividerColor={theme['c-primary']}
              />
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.moreScroll}
            contentContainerStyle={styles.moreScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            <View style={styles.morePanel}>
              <View style={styles.timeHeader}>
                <Text color={theme['c-font-label']}>{t('alarm_clock_other_setting')}</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('alarm_clock_repeat_title')}</Text>
                <View style={styles.optionWrap}>
                  {repeatList.map(item => (
                    <Button
                      key={item.id}
                      style={{
                        ...styles.chip,
                        backgroundColor: draft.repeat == item.id ? theme['c-primary'] : theme['c-button-background'],
                      }}
                      onPress={() => { setDraft(prev => ({ ...prev, repeat: item.id })) }}
                    >
                      <Text
                        style={styles.chipText}
                        color={draft.repeat == item.id ? theme['c-primary-light-1000'] : theme['c-font']}
                      >
                        {t(item.label)}
                      </Text>
                    </Button>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('alarm_clock_source_title')}</Text>
                <View style={styles.optionWrap}>
                  {sourceList.map(item => (
                    <Button
                      key={item.id}
                      style={{
                        ...styles.chip,
                        backgroundColor: draft.source == item.id ? theme['c-primary'] : theme['c-button-background'],
                      }}
                      onPress={() => { setDraft(prev => ({ ...prev, source: item.id })) }}
                    >
                      <Text
                        style={styles.chipText}
                        color={draft.source == item.id ? theme['c-primary-light-1000'] : theme['c-font']}
                      >
                        {t(item.label)}
                      </Text>
                    </Button>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <CheckBoxItem
                  check={draft.applyVolume}
                  label={t('alarm_clock_volume_apply')}
                  onChange={check => { setDraft(prev => ({ ...prev, applyVolume: check })) }}
                />
                <View style={styles.volumeRow}>
                  <Text>{t('alarm_clock_volume_value', { value: Math.round(draft.volume * 100) })}</Text>
                  <Slider
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={Math.round(draft.volume * 100)}
                    onValueChange={value => {
                      setDraft(prev => ({ ...prev, volume: Math.trunc(value) / 100 }))
                    }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          style={{ ...styles.footerBtn, backgroundColor: theme['c-button-background'] }}
          onPress={() => { setShowMore(prev => !prev) }}
        >
          <Text style={styles.footerText} color={theme['c-button-font']}>
            {t(showMore ? 'alarm_clock_show_time_setting' : 'alarm_clock_other_setting')}
          </Text>
        </Button>
        <Button
          style={{ ...styles.footerBtn, backgroundColor: theme['c-primary'] }}
          onPress={handleSave}
        >
          <Text style={styles.footerText} color={theme['c-primary-light-1000']}>{t('done')}</Text>
        </Button>
      </View>
    </Dialog>
  )
}

export default forwardRef(AlarmEditModal)

const styles = createStyle({
  modalContent: {
    width: 340,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  contentArea: {
    flexShrink: 1,
  },
  moreScroll: {
    flexShrink: 1,
  },
  moreScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  timeHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  timePanel: {
    alignItems: 'center',
    marginBottom: 18,
  },
  timePreview: {
    textAlign: 'center',
    marginBottom: 8,
  },
  morePanel: {
    marginTop: 6,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },
  chipText: {
    textAlign: 'center',
  },
  volumeRow: {
    paddingLeft: 25,
    paddingRight: 8,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
})
