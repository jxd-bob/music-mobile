import { memo } from 'react'
import { useTheme } from '@/store/theme/hook'
import { setNavActiveId } from '@/core/common'
import Btn from './Btn'

export default memo(() => {
  const theme = useTheme()

  const handleShow = () => {
    setNavActiveId('nav_alarm')
  }

  return (
    <Btn icon="music_time" color={theme['c-font-label']} onPress={handleShow} />
  )
})
