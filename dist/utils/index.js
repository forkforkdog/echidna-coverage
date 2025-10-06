"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractNameFromPath = exports.parseScopeFile = exports.checkLatestVersion = void 0;
const https_1 = __importDefault(require("https"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const style_1 = require("../style");
// Compare semantic versions (returns true if v1 > v2)
const isVersionGreater = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;
        if (num1 > num2)
            return true;
        if (num1 < num2)
            return false;
    }
    return false; // versions are equal
};
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
                    // Only show update message if latest version is actually greater
                    if (latestVersion && isVersionGreater(latestVersion, currentVersion)) {
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
const parseScopeFile = (scopeFilePath) => {
    try {
        const fileContent = fs.readFileSync(scopeFilePath, "utf-8");
        const lines = fileContent.trim().split("\n");
        // Skip header line
        const dataLines = lines.slice(1);
        return dataLines.map((line) => {
            const parts = line.split(",");
            if (parts.length < 4) {
                throw new Error(`Invalid scope file format: ${line}`);
            }
            return {
                path: parts[0].trim(),
                source: parseInt(parts[1].trim(), 10),
                total: parseInt(parts[2].trim(), 10),
                comment: parseInt(parts[3].trim(), 10),
            };
        });
    }
    catch (error) {
        console.error(style_1.style.error(`Error reading scope file: ${error}`));
        return [];
    }
};
exports.parseScopeFile = parseScopeFile;
const getContractNameFromPath = (fullPath) => {
    // Extract the filename from the full path
    // e.g., "amm-pool-type-dynamic/src/DynamicPoolType.sol" -> "DynamicPoolType.sol"
    return path.basename(fullPath);
};
exports.getContractNameFromPath = getContractNameFromPath;
