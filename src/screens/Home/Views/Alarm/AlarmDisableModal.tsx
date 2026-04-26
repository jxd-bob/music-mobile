import { forwardRef, useImperativeHandle, useRef, useState, type ForwardedRef } from 'react'
import { View } from 'react-native'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'

export interface AlarmDisableModalType {
  show: (info: { dateText: string, onSkip: () => void | Promise<void>, onDisable: () => void | Promise<void> }) => void
}

const AlarmDisableModal = (_: {}, ref: ForwardedRef<AlarmDisableModalType>) => {
  const dialogRef = useRef<DialogType>(null)
  const theme = useTheme()
  const t = useI18n()
  const [dateText, setDateText] = useState('')
  const actionRef = useRef<{ onSkip: () => void | Promise<void>, onDisable: () => void | Promise<void> } | null>(null)

  useImperativeHandle(ref, () => ({
    show(info) {
      setDateText(info.dateText)
      actionRef.current = { onSkip: info.onSkip, onDisable: info.onDisable }
      dialogRef.current?.setVisible(true)
    },
  }))

  const handleSkip = () => {
    void actionRef.current?.onSkip()
    dialogRef.current?.setVisible(false)
  }

  const handleDisable = () => {
    void actionRef.current?.onDisable()
    dialogRef.current?.setVisible(false)
  }

  return (
    <Dialog ref={dialogRef} title={t('alarm_clock_disable_title')}>
      <View style={styles.content}>
        <Text>{t('alarm_clock_disable_repeat_tip')}</Text>
      </View>
      <View style={styles.footer}>
        <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={() => { dialogRef.current?.setVisible(false) }}>
          <Text style={styles.btnText} color={theme['c-button-font']}>{t('cancel')}</Text>
        </Button>
        <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleDisable}>
          <Text style={styles.btnText} color={theme['c-button-font']}>{t('alarm_clock_disable_forever')}</Text>
        </Button>
        <Button style={{ ...styles.btn, backgroundColor: theme['c-primary'] }} onPress={handleSkip}>
          <Text style={styles.btnText} color={theme['c-primary-light-1000']}>{t('alarm_clock_disable_once', { date: dateText })}</Text>
        </Button>
      </View>
    </Dialog>
  )
}

export default forwardRef(AlarmDisableModal)

const styles = createStyle({
  content: {
    width: 340,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  btn: {
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnText: {
    textAlign: 'center',
  },
})
