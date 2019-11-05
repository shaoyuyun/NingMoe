// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, Menu, Tray, globalShortcut, Notification, dialog} = require('electron')
const path = require('path')
const ICON = path.join(__dirname, 'icon.jpg')

// 注意这个autoUpdater不是electron中的autoUpdater
const {autoUpdater} = require('electron-updater')
const uploadUrl = 'https://mipamoe-image.oss-cn-hongkong.aliyuncs.com/ningmoe/update/'


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow // 程序窗口
let trayApp // 程序右下角图标
let notification // 程序通知

function createWindow () {
  // Create the browser window.
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 1201,
    height: 720,
    frame: true,
    useContentSize: true,
    darkTheme: true,
    icon: ICON,
    frame: false,
    show: false,
    resizable: false,
    backgroundColor: '#fff',
    webPreferences: {
      nodeIntegration: true
    }
  })

  // 加载完毕再显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
  ipcMessager(mainWindow)
  createTray(ICON)

  // 创建桌面通知
  notification = new Notification({
    title: 'NingMoe',
    body: '柠萌瞬间',
    silent: true
  })
  // and load the index.html of the app.
  mainWindow.loadURL(path.join('file://', __dirname, '/app/dist/index.html'))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  updateHandle()
}

// 创建右下角程序图标及图标右键菜单
function createTray(icon) {
  trayApp = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([{
    label: '显示',
    click: () => {
      mainWindow.center()
      mainWindow.show()
    }
  },{
    label: '隐藏',
    click: () => {
      mainWindow.hide()
    }
  },{
    label: '关闭',
    click: () => {
      mainWindow.close()
    }
  }])

  trayApp.setContextMenu(contextMenu)
}
// windows下使用任务栏气泡通知
function trayMessage(content) {
  if (!trayApp) return
  trayApp.displayBalloon({icon: ICON, title: '柠萌瞬间', content})
}

// 绑定ipc消息
function ipcMessager(main) {
  // 监听收藏番剧事件
  ipcMain.on('like-anime', (event) => {
    notification.show()
    trayMessage('已成功收藏此番剧')
  })
  // 监听取消搜藏事件
  ipcMain.on('unlike-anime', (event) => {
    notification.show()
    trayMessage('已取消收藏此番剧')
  })
  // 监听播放错误事件
  ipcMain.on('error-anime-play', (event) => {
    dialog.showErrorBox('错误', '暂无可用的播放源，请之后再试')
  })
  // 监听搜索错误事件
  ipcMain.on('please-input-search-keyword', (event) => {
    dialog.showErrorBox('错误', '请输入要搜索的番剧名称')
  })
  // 监听登录错误事件
  ipcMain.on('please-login-first', (event) => {
    dialog.showErrorBox('错误', '请先登录')
  })
  ipcMain.on('login-failed', (event, arg) => {
    dialog.showErrorBox('错误', arg)
  })
  // 任务栏图标设置播放进度
  ipcMain.on('video-play-progress', (event, arg) => {
    mainWindow.setProgressBar(arg)
  })
  // 最小化和关闭
  ipcMain.on('min', (event) => {
    mainWindow.minimize()
  })
  ipcMain.on('close', (event) => {
    mainWindow.close()
  })
}

// 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
function updateHandle() {
  let message = {
    error: '检查更新出错',
    checking: '正在检查更新……',
    updateAva: '检测到新版本，正在下载……',
    updateNotAva: '现在使用的就是最新版本，不用更新',
  };
  const os = require('os');

  autoUpdater.setFeedURL(uploadUrl);
  autoUpdater.on('error', function (error) {
    sendUpdateMessage(message.error)
  });
  autoUpdater.on('checking-for-update', function () {
    sendUpdateMessage(message.checking)
  });
  autoUpdater.on('update-available', function (info) {
    sendUpdateMessage(message.updateAva)
  });
  autoUpdater.on('update-not-available', function (info) {
    sendUpdateMessage(message.updateNotAva)
  });

  // 更新下载进度事件
  autoUpdater.on('download-progress', function (progressObj) {
    mainWindow.webContents.send('downloadProgress', progressObj)
  })
  autoUpdater.on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {

    ipcMain.on('isUpdateNow', (e, arg) => {
      console.log(arguments);
      console.log("开始更新");
      //some code here to handle event
      autoUpdater.quitAndInstall();
    });

    mainWindow.webContents.send('updateDownloaded')
  });

  ipcMain.on("checkForUpdate",()=>{
    //执行自动更新检查
    autoUpdater.checkForUpdates();
  })
}

// 通过main进程发送事件给renderer进程，提示更新信息
function sendUpdateMessage(text) {
  mainWindow.webContents.send('message', text)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow()

  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+Alt+X', () => {
    const gShortcutDialog = {
      type: 'info',
      message: '询问',
      detail: '你是要退出柠萌瞬间吗？',
      buttons: ['是的', '按错了']
    }
    dialog.showMessageBox(gShortcutDialog, (index) => {
      if (index == 0) {
        mainWindow.close()
      } else {
        return
      }
    })
  })
  // 快捷键隐藏程序
  globalShortcut.register('CommandOrControl+Alt+H', () => {
    mainWindow.hide()
    // 弹出windows通知
    notification.show()
    trayMessage('柠萌已最小化到托盘')
  })
  // 快捷键全局刷新
  globalShortcut.register('CommandOrControl+F5', () => {
    mainWindow.reload()
  })
  // 快捷键打开开发者工具
  globalShortcut.register('CommandOrControl+Alt+I', () => {
    mainWindow.webContents.openDevTools()
  })
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()

  if (trayApp) trayApp.destroy()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
app.setName('柠萌瞬间')