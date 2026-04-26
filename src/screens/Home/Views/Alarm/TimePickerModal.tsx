import { forwardRef, useImperativeHandle, useRef, useState, type ForwardedRef } from 'react'
import { View } from 'react-native'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import Slider from '@/components/common/Slider'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'

const formatNum = (num: number) => String(num).padStart(2, '0')

export interface TimePickerModalType {
  show: (time: string) => void
}

interface TimePickerModalProps {
  onConfirm: (time: string) => void
}

const TimePickerModal = ({ onConfirm }: TimePickerModalProps, ref: ForwardedRef<TimePickerModalType>) => {
  const alertRef = useRef<ConfirmAlertType>(null)
  const t = useI18n()
  const theme = useTheme()
  const [hour, setHour] = useState(7)
  const [minute, setMinute] = useState(30)

  useImperativeHandle(ref, () => ({
    show(time: string) {
      const [h = '7', m = '30'] = time.split(':')
      setHour(Math.min(Math.max(parseInt(h) || 0, 0), 23))
      setMinute(Math.min(Math.max(parseInt(m) || 0, 0), 59))
      alertRef.current?.setVisible(true)
    },
  }))

  const handleConfirm = () => {
    onConfirm(`${formatNum(hour)}:${formatNum(minute)}`)
    alertRef.current?.setVisible(false)
  }

  return (
    <ConfirmAlert
      ref={alertRef}
      title={t('alarm_clock_time_picker_title')}
      onConfirm={handleConfirm}
    >
      <View style={styles.container}>
        <Text
          style={styles.preview}
          size={22}
          color={theme['c-primary-font']}
        >
          {formatNum(hour)}
          :
          {formatNum(minute)}
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('alarm_clock_hour')}</Text>
          <Text
            style={styles.value}
            color={theme['c-font-label']}
          >
            {formatNum(hour)}
          </Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={23}
          step={1}
          value={hour}
          onValueChange={value => {
            setHour(Math.trunc(value))
          }}
        />
        <View style={styles.row}>
          <Text style={styles.label}>{t('alarm_clock_minute')}</Text>
          <Text
            style={styles.value}
            color={theme['c-font-label']}
          >
            {formatNum(minute)}
          </Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={59}
          step={1}
          value={minute}
          onValueChange={value => {
            setMinute(Math.trunc(value))
          }}
        />
      </View>
    </ConfirmAlert>
  )
}

export default forwardRef(TimePickerModal)

const styles = createStyle({
  container: {
    minWidth: 280,
    paddingTop: 6,
  },
  preview: {
    textAlign: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    marginTop: 8,
  },
  value: {
    marginTop: 8,
  },
})
