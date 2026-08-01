# SignalRGB Frozen Warframe Pro RGB565 fix

Unofficial SignalRGB device-plugin override for the Thermalright Frozen Warframe Pro 320×320 LCD.

The stock Thermalright plugin renders the correct canvas preview but can send incorrect colors to this panel. Orange may appear blue; a red/blue channel swap can make it green. This override preserves the RGB565 color fields and swaps the two bytes of each pixel so the panel receives RGB565 most-significant byte first.

## Tested configuration

- Cooler: Thermalright Frozen Warframe Pro
- LCD resolution: 320×320
- USB ID: `87AD:70DB`
- SignalRGB: 2.5.74
- Thermalright TRCC: 2.1.6, used to verify the panel's frame format
- Operating system: Windows 11

Other Thermalright models continue to use the behavior of SignalRGB's bundled Thermalright controller. The byte-order correction is gated to model ID `0x20` with `RGB565` encoding.

## Install

1. Exit Thermalright TRCC completely. TRCC and SignalRGB cannot control the LCD simultaneously.
2. Exit SignalRGB from its system-tray icon.
3. Copy `Thermalright_LCD_Controller_Frozen_Warframe_Pro.js` to:

   ```text
   %USERPROFILE%\Documents\WhirlwindFX\Plugins\
   ```

4. Start SignalRGB.
5. Open **Devices → Frozen Warframe Pro → LCD** and select the desired content.

SignalRGB should report that the custom plugin overrides USB device `87AD:70DB`.

## Update and rollback

SignalRGB may eventually include an equivalent upstream fix. After updating SignalRGB, temporarily move this file out of `Documents\WhirlwindFX\Plugins`, restart SignalRGB, and test the bundled plugin.

To roll back this override, delete or move the custom plugin file and restart SignalRGB.

## Technical note

SignalRGB's `RGB565` frame is consumed here as little-endian pixel pairs. The Frozen Warframe Pro expects the same RGB565 value with its high byte first:

```text
SignalRGB: [GGGBBBBB, RRRRRGGG]
Panel:     [RRRRRGGG, GGGBBBBB]
```

The override swaps `frame[i]` and `frame[i + 1]` for each Frozen Warframe Pro pixel. It does not swap red and blue channels.

## Status

Tested on one physical Frozen Warframe Pro unit. Reports from other revisions are welcome; include the cooler model, USB ID, SignalRGB version, and a photo of both the preview and physical LCD.

## Attribution and licensing

This is an unofficial community fix and is not affiliated with or endorsed by Thermalright, WhirlwindFX, or SignalRGB.

The controller file is derived from SignalRGB's bundled `Thermalright_LCD_Controller.js`. SignalRGB and the original plugin remain the property of their respective owners. The upstream plugin repository does not currently provide an explicit license file, so this repository does not apply a new license to that derived file.

