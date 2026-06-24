import { CorePalette, Hct, hexFromArgb, TonalPalette } from '@material/material-color-utilities'
import { Dark } from 'quasar'
import { watchEffect } from 'vue'

// 应用 Material You 动态主题色（移植自参考项目），默认主色调为企业蓝
export function useSetTheme(hue = 230) {
  watchEffect(() => {
    const palette = CorePalette.contentOf(Hct.from(hue, 40, 40).toInt())
    const primary = palette.a1
    const secondary = palette.a2
    const tertiary = palette.a3
    const neutral = palette.n1
    const neutralVariant = palette.n2
    const error = palette.error
    const success = TonalPalette.fromHueAndChroma(140, 55)
    const warning = TonalPalette.fromHueAndChroma(80, 45)
    const colors = Dark.isActive
      ? {
          pri: primary.tone(80), sec: secondary.tone(80), ter: tertiary.tone(80),
          err: error.tone(80), suc: success.tone(80), warn: warning.tone(80),
          'pri-dim': primary.tone(70),
          'on-pri': primary.tone(20), 'on-sec': secondary.tone(20), 'on-ter': tertiary.tone(20), 'on-err': error.tone(20),
          'pri-c': primary.tone(30), 'sec-c': secondary.tone(30), 'ter-c': tertiary.tone(30), 'err-c': error.tone(30),
          'on-pri-c': primary.tone(90), 'on-sec-c': secondary.tone(90), 'on-ter-c': tertiary.tone(90), 'on-err-c': error.tone(90),
          'sur-dim': neutral.tone(6), sur: neutral.tone(6), 'sur-bri': neutral.tone(24),
          'sur-c-lowest': neutral.tone(4), 'sur-c-low': neutral.tone(10), 'sur-c': neutral.tone(12),
          'sur-c-high': neutral.tone(17), 'sur-c-highest': neutral.tone(24),
          'on-sur': neutral.tone(90), 'on-sur-var': neutralVariant.tone(75),
          out: neutralVariant.tone(50), 'out-mid': neutralVariant.tone(40), 'out-var': neutralVariant.tone(30),
          'inv-sur': neutral.tone(90), 'inv-on-sur': neutral.tone(20), 'inv-pri': primary.tone(40)
        }
      : {
          pri: primary.tone(40), sec: secondary.tone(40), ter: tertiary.tone(40),
          err: error.tone(40), suc: success.tone(40), warn: warning.tone(40),
          'pri-dim': primary.tone(50),
          'on-pri': primary.tone(100), 'on-sec': secondary.tone(100), 'on-ter': tertiary.tone(100), 'on-err': error.tone(100),
          'pri-c': primary.tone(90), 'sec-c': secondary.tone(90), 'ter-c': tertiary.tone(90), 'err-c': error.tone(90),
          'on-pri-c': primary.tone(10), 'on-sec-c': secondary.tone(10), 'on-ter-c': tertiary.tone(10), 'on-err-c': error.tone(10),
          'sur-dim': neutral.tone(87), sur: neutral.tone(98), 'sur-bri': neutral.tone(98),
          'sur-c-lowest': neutral.tone(100), 'sur-c-low': neutral.tone(96), 'sur-c': neutral.tone(94),
          'sur-c-high': neutral.tone(92), 'sur-c-highest': neutral.tone(90),
          'on-sur': neutral.tone(10), 'on-sur-var': neutralVariant.tone(30),
          out: neutralVariant.tone(50), 'out-mid': neutralVariant.tone(60), 'out-var': neutralVariant.tone(80),
          'inv-sur': neutral.tone(20), 'inv-on-sur': neutral.tone(95), 'inv-pri': primary.tone(80)
        }
    const root = document.documentElement.style
    Object.entries(colors).forEach(([key, val]) => {
      root.setProperty(`--a-${key}`, hexFromArgb(val))
    })
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hexFromArgb(colors['sur-c']))
  })
}
