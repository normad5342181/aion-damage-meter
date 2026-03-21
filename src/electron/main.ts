import { app, BrowserWindow } from "electron";
// 引用模块文件需要手动添加js后缀
import { getUIPath } from "./pathResolver.js";

app.on("ready", () => {
  const mainWindow = new BrowserWindow({});

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(getUIPath());
  }
});
