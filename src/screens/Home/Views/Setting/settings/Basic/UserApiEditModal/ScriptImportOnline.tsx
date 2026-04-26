import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { View, TouchableOpacity } from 'react-native'
import Input, { type InputType } from '@/components/common/Input'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { httpFetch } from '@/utils/request'
import { handleImportScript } from './action'
import { DEFAULT_USER_API_SOURCES } from '@/config/defaultUserApiSources'

interface UrlInputType {
  setText: (text: string) => void
  getText: () => string
  focus: () => void
}
const UrlInput = forwardRef<UrlInputType, {}>((props, ref) => {
  const theme = useTheme()
  const [text, setText] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const inputRef = useRef<InputType>(null)

  useImperativeHandle(ref, () => ({
    getText() {
      return text.trim()
    },
    setText(text) {
      setText(text)
      setPlaceholder(global.i18n.t('user_api_btn_import_online_input_tip'))
    },
    focus() {
      inputRef.current?.focus()
    },
  }))

  return (
    <Input
      ref={inputRef}
      placeholder={placeholder}
      value={text}
      onChangeText={setText}
      style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
    />
  )
})


export interface ScriptImportOnlineType {
  show: () => void
}


export default forwardRef<ScriptImportOnlineType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const alertRef = useRef<ConfirmAlertType>(null)
  const urlInputRef = useRef<UrlInputType>(null)
  const [visible, setVisible] = useState(false)
  const [btn, setBtn] = useState({ disabled: false, text: t('user_api_btn_import_online_input_confirm') })
  const [loadingUrl, setLoadingUrl] = useState('')

  const handleShow = () => {
    alertRef.current?.setVisible(true)
    setBtn({ disabled: false, text: t('user_api_btn_import_online_input_confirm') })
    requestAnimationFrame(() => {
      urlInputRef.current?.setText('')
      setTimeout(() => {
        urlInputRef.current?.focus()
      }, 300)
    })
  }
  useImperativeHandle(ref, () => ({
    show() {
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          handleShow()
        })
      }
    },
  }))

  const importScriptByUrl = async(url: string) => {
    if (!/^https?:\/\//.test(url)) {
      urlInputRef.current?.setText('')
      return
    }
    if (!url.length) return
    urlInputRef.current?.setText(url)
    setLoadingUrl(url)
    setBtn({ disabled: true, text: t('user_api_btn_import_online_input_loading') })
    let script: string
    try {
      script = await httpFetch(url).promise.then(resp => resp.body) as string
    } catch (err: any) {
      toast(t('user_api_import_failed_tip', { message: err.message }), 'long')
      return
    } finally {
      setLoadingUrl('')
      setBtn({ disabled: false, text: t('user_api_btn_import_online_input_confirm') })
    }
    if (script.length > 9_000_000) {
      toast(t('user_api_import_failed_tip', { message: 'Too large script' }), 'long')
      return
    }
    void handleImportScript(script)

    alertRef.current?.setVisible(false)
  }

  const handleImport = async() => {
    const url = urlInputRef.current?.getText() ?? ''
    await importScriptByUrl(url)
  }

  return (
    visible
      ? <ConfirmAlert
          ref={alertRef}
          onConfirm={handleImport}
          disabledConfirm={btn.disabled}
          confirmText={btn.text}
        >
          <View style={styles.reurlContent}>
            <Text style={{ marginBottom: 5 }}>{ t('user_api_btn_import_online')}</Text>
            <UrlInput ref={urlInputRef} />
            <Text style={styles.sectionTitle} size={12} color={theme['c-font-label']}>{t('user_api_btn_import_online_default')}</Text>
            {
              DEFAULT_USER_API_SOURCES.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={{ ...styles.presetItem, backgroundColor: theme['c-primary-input-background'] }}
                  disabled={btn.disabled}
                  onPress={() => {
                    void importScriptByUrl(item.url)
                  }}
                >
                  <View style={styles.presetItemText}>
                    <Text size={13}>{item.name}</Text>
                    <Text size={11} color={theme['c-font-label']}>{item.url}</Text>
                  </View>
                  <Text size={12} color={theme['c-primary-font']}>
                    {loadingUrl == item.url ? t('user_api_btn_import_online_input_loading') : t('user_api_btn_import_online_input_confirm')}
                  </Text>
                </TouchableOpacity>
              ))
            }
          </View>
        </ConfirmAlert>
      : null
  )
})


const styles = createStyle({
  reurlContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 290,
    borderRadius: 4,
    // paddingTop: 2,
    // paddingBottom: 2,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
  },
  presetItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  presetItemText: {
    flex: 1,
  },
})

