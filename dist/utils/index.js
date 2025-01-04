"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLatestVersion = void 0;
const https_1 = __importDefault(require("https"));
const style_1 = require("../style");
const checkLatestVersion = (currentVersion) => {
    return new Promise((resolve) => {
        https_1.default
            .get("https://api.github.com/repos/simon-busch/echidna-coverage/tags", {
            headers: {
                "User-Agent": "echidna-coverage",
                Accept: "application/vnd.github.v3+json",
            },
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const tags = JSON.parse(data);
                    if (!Array.isArray(tags) || tags.length === 0) {
                        resolve();
                        return;
                    }
                    // Get latest tag (first in array)
                    const latestVersion = tags[0].name.replace("v", "");
                    if (latestVersion && latestVersion !== currentVersion) {
                        console.log(style_1.style.warning(`\nNew version available: ${latestVersion} (current: ${currentVersion})`));
                        console.log(style_1.style.info("To upgrade, run: brew upgrade Simon-Busch/echidna-coverage/echidna-coverage\n"));
                    }
                }
                catch (error) {
                    console.log(style_1.style.dim("Unable to check for updates"));
                }
                resolve();
            });
        })
            .on("error", () => {
            console.log(style_1.style.dim("Network error checking for updates"));
            resolve();
        });
    });
};
exports.checkLatestVersion = checkLatestVersion;
