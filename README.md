# 🧮 多輸出布林函數最小化工具

## 📖 文件

- [報告書](./報告書.md)
- [測資](./邏輯電路專題 Patrick Method 測資.md)

## 🌐 線上版本
**🚀 立即使用：[https://bigsticktw.github.io/boolean-function-minimizer/](https://bigsticktw.github.io/boolean-function-minimizer/)**

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)](https://bigsticktw.github.io/boolean-function-minimizer/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-blue.svg)](https://bigsticktw.github.io/boolean-function-minimizer/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 項目簡介

這是一個基於 **Patrick Method** 演算法的多輸出布林函數最小化工具，專為邏輯電路設計和布林代數最佳化而開發。該工具支援多種輸入格式，能夠自動找到最佳的邏輯表達式，並通過硬體共享最小化總體成本。

**🚀 現已支援 PWA (Progressive Web App) 功能，可安裝到桌面和手機！**

## ✨ 功能特色

### 🎯 核心功能
- **多輸出最佳化**：同時處理多個布林函數，找到全域最佳解
- **Patrick Method 演算法**：實現完整的三階段最佳化流程
- **硬體共享最佳化**：自動識別可共享的 Prime Implicants，降低硬體成本
- **智能算法選擇**：根據問題規模自動選擇回溯搜索或窮舉搜索

### 📱 PWA 功能
- **🔗 線上使用**：[https://bigsticktw.github.io/boolean-function-minimizer/](https://bigsticktw.github.io/boolean-function-minimizer/)
- **📱 Android 安裝**：支援安裝到 Android 手機主畫面
- **⚡ 離線使用**：安裝後可在無網路環境下使用
- **🚀 快速啟動**：從主畫面直接啟動，載入速度快
- **🔄 自動更新**：應用更新時自動同步最新版本
- **🌐 全平台網頁版**：所有平台都可使用完整網頁版功能

### 🆕 最新功能
- **📤 分享結果**：一鍵分享計算結果到其他應用
- **📋 複製結果**：快速複製結果到剪貼板
- **📁 檔案拖放**：支援拖放 `.txt` 和 `.json` 檔案載入數據
- **🔗 URL 參數**：支援 `?mode=pi` 和 `?mode=minterm` 直接切換模式
- **⚡ 快捷方式**：安裝後可直接啟動特定輸入模式

### 📊 輸入模式
1. **Prime Implicants 模式**：直接輸入已知的 Prime Implicants
2. **Minterms 模式**：輸入 Minterms 和 Don't Care 項，自動生成 Prime Implicants

### 🔍 算法特色
- **三階段成本計算**：
  - Stage 1：基本 PI 成本計算
  - Stage 2：各函數獨立冗餘移除
  - Stage 3：Patrick 共享成本計算
- **智能剪枝**：多層剪枝策略提高搜索效率
- **成本最佳化**：支援單個 literal 和多個 literals 的不同成本計算

## 🚀 快速開始

### 🌐 線上使用（推薦）
**直接訪問：[https://bigsticktw.github.io/boolean-function-minimizer/](https://bigsticktw.github.io/boolean-function-minimizer/)**

### 📱 PWA 安裝

> **📱 目前僅支援 Android 設備安裝**  
> iOS、Windows、macOS 等平台的 PWA 安裝功能正在開發中，敬請期待！

1. **Android 手機瀏覽器**：
   - 使用 Chrome、Edge 或其他支援 PWA 的瀏覽器
   - 訪問 [線上版本](https://bigsticktw.github.io/boolean-function-minimizer/)
   - 點擊「加入主畫面」或「安裝應用程式」
   - 應用圖標將出現在主畫面上，可離線使用

2. **桌面瀏覽器**（僅網頁版）：
   - 訪問 [線上版本](https://bigsticktw.github.io/boolean-function-minimizer/)
   - 可正常使用所有功能，但暫不支援安裝到桌面
   - 建議加入書籤以便快速訪問

3. **快捷啟動**：
   - PI 模式：[https://bigsticktw.github.io/boolean-function-minimizer/?mode=pi](https://bigsticktw.github.io/boolean-function-minimizer/?mode=pi)
   - Minterm 模式：[https://bigsticktw.github.io/boolean-function-minimizer/?mode=minterm](https://bigsticktw.github.io/boolean-function-minimizer/?mode=minterm)

### 💻 本地部署
1. 克隆或下載項目文件
2. 使用 HTTP 服務器運行（避免 CORS 問題）：
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx serve .
   
   # PHP
   php -S localhost:8000
   ```
3. 訪問 `http://localhost:8000`

### 系統需求
- **網頁版**：現代網頁瀏覽器（Chrome 88+、Firefox 85+、Safari 14+、Edge 88+）
- **Android PWA**：Android 設備 + Chrome/Edge 瀏覽器
- **技術要求**：支援 JavaScript ES6+、Service Worker
- **其他平台**：僅支援網頁版，功能完整但無法安裝

## 📖 使用指南

### 1. 設定變數
在「變數設定」欄位中輸入邏輯變數，用逗號分隔：
```
x,y,z
```
或
```
a,b,c,d
```

### 2. 選擇輸入模式

#### Prime Implicants 模式
適用於已知 Prime Implicants 的情況：

**範例輸入**：
```
函數 F1:
- PI1: 01-
- PI2: -11

函數 F2:
- PI1: 0-1
- PI2: 1-0
```

**輸出函數定義**（可選）：
```
F1: 2,3,6,7
F2: 1,4,5
```

#### Minterms 模式
適用於從 Minterms 開始設計的情況：

**範例輸入**：
```
函數 F1:
- Minterms: 2,3,6,7
- Don't Care: 1

函數 F2:
- Minterms: 1,4,5
- Don't Care: 0
```

### 3. 執行最佳化
點擊「🚀 執行多輸出最佳化」按鈕，系統將：
1. 解析輸入資料
2. 生成或處理 Prime Implicants
3. 執行 Patrick Method 演算法
4. 計算最佳共享方案
5. 顯示詳細結果

### 4. 結果操作
- **📤 分享結果**：將結果分享到其他應用
- **📋 複製結果**：複製完整結果到剪貼板
- **📁 檔案操作**：拖放檔案載入數據

### 5. 結果解讀

#### 最佳化結果範例
```
🔹 解決方案 1:
F1 = b'c' + bd' + ac' + cd
使用的PI: --11, -00-, -1-0, 1-0-
共享成本: 12 個閘級

🔹 解決方案 2:
F1 = c'd' + b'd + ac' + bc
使用的PI: --00, -0-1, -11-, 1-0-
共享成本: 12 個閘級
```

#### 成本分析
```
💰 成本分析
成本計算方式：1個literal成本=1，多個literals成本=literal數量+1
例如：y 有 1 個符號，成本為 1；x'z' 有 2 個符號，成本為 2 + 1 = 3

個別最佳化總成本: 12
共享最佳化總成本: 12
```

## 🛠️ 技術架構

### 前端技術
- **HTML5**：語義化標記和現代 Web 標準
- **CSS3**：響應式設計和現代視覺效果
- **JavaScript ES6+**：模組化程式設計和現代語法
- **PWA**：Service Worker、Web App Manifest

### 核心算法
- **Quine-McCluskey**：Prime Implicants 生成
- **Patrick Method**：最小覆蓋求解
- **回溯搜索**：最佳化解空間探索
- **動態規劃**：成本計算最佳化

### PWA 特性
- **Service Worker**：離線緩存和更新管理
- **Web App Manifest**：應用配置和圖標
- **Cache API**：智能緩存策略
- **Background Sync**：背景同步（未來功能）

## 📊 性能指標

### 算法效能(單函數輸出情況)
- **小規模問題**（≤4變數）：< 100ms
- **中規模問題**（5-6變數）：< 1s
- **大規模問題**（7+變數）：< 10s（視複雜度而定）

### PWA 性能
- **首次載入**：< 2s
- **重複訪問**：< 500ms（緩存）
- **離線啟動**：< 300ms
- **安裝大小**：< 1MB

## 🔧 開發指南

### 項目結構
```
boolean-function-minimizer/
├── index.html              # 主要網頁
├── patrick-method-core.js   # 核心算法
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker
├── README.md              # 項目說明
├── android/               # Android 圖標
├── ios/                   # iOS 圖標
├── windows11/             # Windows 圖標
└── icons.json             # 圖標配置
```

### 本地開發
1. **克隆項目**：
   ```bash
   git clone https://github.com/bigsticktw/boolean-function-minimizer.git
   cd boolean-function-minimizer
   ```

2. **啟動開發服務器**：
   ```bash
   python -m http.server 8000
   ```

3. **訪問開發版本**：
   ```
   http://localhost:8000
   ```

### 部署更新
1. **推送到 GitHub**：
   ```bash
   git add .
   git commit -m "Update features"
   git push origin main
   ```

2. **GitHub Pages 自動部署**：
   - 推送後自動更新線上版本
   - 通常在 1-2 分鐘內生效

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 報告問題
- 使用 [GitHub Issues](https://github.com/bigsticktw/boolean-function-minimizer/issues)
- 提供詳細的問題描述和重現步驟
- 包含瀏覽器版本和操作系統資訊

### 功能建議
- 在 Issues 中標記為 `enhancement`
- 描述功能的用途和預期行為
- 提供使用場景和範例

### 代碼貢獻
1. Fork 項目
2. 創建功能分支
3. 提交變更
4. 發起 Pull Request

## 🙏 致謝

- **Patrick Method 演算法**：基於經典的邏輯最小化理論
- **Quine-McCluskey 演算法**：Prime Implicants 生成的標準方法
- **PWA 技術**：現代 Web 應用開發標準
- **GitHub Pages**：免費的靜態網站託管服務

## 📞 聯絡資訊

- **線上工具**：[https://bigsticktw.github.io/boolean-function-minimizer/](https://bigsticktw.github.io/boolean-function-minimizer/)
- **GitHub 項目**：[https://github.com/bigsticktw/boolean-function-minimizer](https://github.com/bigsticktw/boolean-function-minimizer)
- **問題回報**：[GitHub Issues](https://github.com/bigsticktw/boolean-function-minimizer/issues)

---

**🚀 立即體驗：[https://bigsticktw.github.io/boolean-function-minimizer/](https://bigsticktw.github.io/boolean-function-minimizer/)** 