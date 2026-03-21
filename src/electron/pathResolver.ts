import { app } from "electron";
import path from "path";

export function getUIPath() {
  return path.join(app.getAppPath(), "/dist-react/index.html");
}
