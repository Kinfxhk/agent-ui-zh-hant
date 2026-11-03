# 已知缺口（M0）

語包只能覆蓋經 `@deepseek-ai/dsh-client-locale` **registry** 的文案。以下 **不會** 因安裝本插件而自動變繁中：

| 缺口 | 說明 |
|------|------|
| Desktop 原生選單 | Application／Edit 等殼層選單只跟系統 `en`／`zh`；client 語包改不到（見上游 Discussion #11023） |
| 內聯 text map | 部份 mode 說明等不經 `locale.register` → 仍簡中／原文 |
| 第三方／市場文案 | 未 call `ctx.locale` 的插件標題／描述；manifest 字串可能在註冊時凍結 |
| 機械轉換 | OpenCC `s2hk` ≠ 香港書面語；靠 [`glossaries/zh-HK`](../glossaries/zh-HK.md) 人手表 |
| 非 P0 namespaces | M0 只註冊 common／settings／chat／sidebar（另附 conversation、settings.locale）；其餘 fallback → `zh` → `en` |
| TW id | `zh-TW` 可選，留待後續 milestone |

占位：截圖／GIF 位置見 README「圖文占位」。
