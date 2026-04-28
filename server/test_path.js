import { FILE_CONFIG } from "./lib/fileUtils.js";
console.log("FILE_CONFIG.UPLOAD_DIR:", FILE_CONFIG.UPLOAD_DIR);
console.log("process.cwd():", process.cwd());
const filePath = "/home/mikekey/Builds/FasterChat/app/server/data/uploads/test.html";
const relativePath = filePath.replace(process.cwd() + "/", "");
console.log("filePath:", filePath);
console.log("relativePath:", relativePath);
