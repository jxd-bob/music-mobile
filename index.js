/**
 * @format
 */
import { AppRegistry } from 'react-native'
import './shim'
import './src/app'
import { runAlarmClockHeadlessTask } from './src/core/player/alarmClockHeadless'

AppRegistry.registerHeadlessTask('AlarmClockHeadlessTask', () => runAlarmClockHeadlessTask)
// import './test'
// import '@/utils/errorHandle'
// import { Navigation } from 'react-native-navigation'
// import App from './App'

// Navigation.registerComponent('com.myApp.WelcomeScreen', () => App)
// Navigation.events().registerAppLaunchedListener(() => {
//   Navigation.setRoot({
//     root: {
//       stack: {
//         children: [
//           {
//             component: {
//               name: 'com.myApp.WelcomeScreen',
//             },
//           },
//         ],
//       },
//     },
//   })
// })
