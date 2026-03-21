"use strict";
contextBridge.exposeInMainWorld('electronAPI', {
    sendMessage: (message) => ipcRenderer.send('message', message),
});
