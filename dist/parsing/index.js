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
exports.readFileAndProcess = readFileAndProcess;
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
function parseFunctions(lines, allFunctions) {
    const functions = [];
    let currentFunction = null;
    let bracketCount = 0;
    let functionBodyStarted = false;
    let isViewPure = false;
    let commentTracker = false;
    lines.forEach((line, index) => {
        const parts = line.split("|").map((part) => part.trim());
        if (parts.length < 3)
            return;
        const content = parts[2];
        const functionMatch = content.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        // Check for function start
        if (functionMatch) {
            bracketCount = 0;
            functionBodyStarted = false;
            isViewPure = checkViewOrPureFunction(content);
            currentFunction = {
                name: functionMatch[1],
                lines: [],
                isTouched: false,
                isReverted: false,
                coveredLines: 1,
                untouchedLines: 0,
                revertedLines: 0,
                isTotallyCovered: false,
                revertedContent: [],
                untouchedContent: [],
                totalLines: 0,
                isViewPure: isViewPure,
            };
        }
        // Check lines between function declaration and opening brace for view/external
        if (currentFunction && !functionBodyStarted) {
            if (checkViewOrPureFunction(content)) {
                currentFunction.isViewPure = checkViewOrPureFunction(content);
            }
        }
        if (currentFunction) {
            const trimmedContent = content.trim();
            if (trimmedContent.includes("/*")) {
                commentTracker = true;
            }
            if (trimmedContent.includes("*/")) {
                commentTracker = false;
            }
            if (commentTracker) {
                return;
            }
            currentFunction.lines.push(line);
            currentFunction.totalLines++;
            if (content.includes("{")) {
                bracketCount++;
                if (bracketCount === 1) {
                    functionBodyStarted = true;
                    return;
                }
            }
            if (functionBodyStarted) {
                if (trimmedContent === "assembly {") {
                    const nextParts = lines[index + 1]
                        .split("|")
                        .map((part) => part.trim());
                    if (nextParts[1] === "*") {
                        currentFunction.coveredLines++;
                        currentFunction.isTouched = true;
                    }
                    else if (nextParts[1] === "r") {
                        currentFunction.revertedLines++;
                        currentFunction.revertedContent.push(content);
                        currentFunction.isReverted = true;
                        currentFunction.isTouched = true;
                    }
                    else if (nextParts[1] === "" && isUntouchedLine(content)) {
                        currentFunction.untouchedLines++;
                        currentFunction.untouchedContent.push(content);
                    }
                }
                else if (trimmedContent === "}") {
                    // Don't count closing brace
                    null;
                }
                else if (parts[1] === "*") {
                    currentFunction.coveredLines++;
                    currentFunction.isTouched = true;
                }
                else if (parts[1] === "r") {
                    currentFunction.revertedLines++;
                    currentFunction.revertedContent.push(content);
                    currentFunction.isReverted = true;
                    currentFunction.isTouched = true;
                }
                else if (parts[1] === "" && isUntouchedLine(content)) {
                    if (lines[index - 1]
                        .split("|")
                        .map((part) => part.trim())[2]
                        .endsWith(",") ||
                        content.startsWith('"') ||
                        (lines[index - 1].split("|").map((part) => part.trim())[1] ===
                            "*" &&
                            lines[index + 1].split("|").map((part) => part.trim())[1] === "*")) {
                        currentFunction.coveredLines++;
                        currentFunction.isTouched = true;
                    }
                    else {
                        currentFunction.untouchedLines++;
                        currentFunction.untouchedContent.push(content);
                    }
                }
            }
            if (content.includes("}")) {
                bracketCount--;
                if (bracketCount === 0 && currentFunction) {
                    functions.push(currentFunction);
                    currentFunction = null;
                    functionBodyStarted = false;
                }
            }
        }
    });
    functions.map((f) => {
        if (f.coveredLines > 0 && f.untouchedLines === 0 && f.revertedLines === 0) {
            f.isTotallyCovered = true;
        }
    });
    if (allFunctions) {
        return functions;
    }
    else {
        return functions.filter((f) => !f.isViewPure);
    }
}
function isUntouchedLine(content) {
    const trimmedContent = content.trim();
    // Skip empty lines
    if (trimmedContent === "")
        return false;
    // Skip function declarations and structural elements
    if (trimmedContent.startsWith("function") ||
        trimmedContent === "{" ||
        trimmedContent === "}" ||
        trimmedContent.includes(") {") ||
        trimmedContent === ");" ||
        trimmedContent.trim() === "} catch {" ||
        trimmedContent.trim() === "});" ||
        trimmedContent.startsWith("console"))
        return false;
    // Skip visibility keywords
    if (trimmedContent.includes("public") ||
        trimmedContent.includes("private") ||
        trimmedContent.includes("external") ||
        trimmedContent.includes("internal") ||
        trimmedContent.includes("view"))
        return false;
    // Standalone brackets
    if (trimmedContent === "(" || trimmedContent === ")")
        return false;
    // Skip else blocks
    if (trimmedContent === "} else {")
        return false;
    // Handle comments - don't skip single line comments
    if (trimmedContent.startsWith("/*") ||
        trimmedContent.startsWith("*") ||
        trimmedContent.startsWith("//"))
        return false;
    return true;
}
function calculateCoverage(functions) {
    const totalFunctions = functions.length;
    const coveredFunctions = functions.filter((f) => f.isTotallyCovered).length;
    const coveredLines = functions.reduce((acc, f) => acc + f.coveredLines, 0);
    const revertedFunctions = functions.filter((f) => f.isReverted).length;
    const totalUntouchedLines = functions.reduce((acc, f) => acc + f.untouchedLines, 0);
    const functionCoveragePercentage = coveredFunctions === 0 && totalFunctions === 0
        ? 0
        : Number(((coveredFunctions / totalFunctions) * 100).toFixed(2));
    const lineCoveragePercentage = coveredLines === 0 && totalUntouchedLines === 0
        ? 0
        : Number(((coveredLines / (coveredLines + totalUntouchedLines)) * 100).toFixed(2));
    return {
        totalFunctions: totalFunctions,
        fullyCoveredFunctions: coveredFunctions,
        coveredLines: coveredLines,
        revertedLines: revertedFunctions,
        untouchedLines: totalUntouchedLines,
        functionCoveragePercentage: functionCoveragePercentage,
        lineCoveragePercentage: lineCoveragePercentage,
    };
}
function processFileContent(fileContent, allFunctions) {
    const lines = fileContent.split("\n");
    const fileDataMap = {};
    let currentPath = "";
    // First, group lines by file
    lines.forEach((line) => {
        const pathMatch = line.match(/^\/.*\/.*$/);
        if (pathMatch) {
            currentPath = pathMatch[0];
            const pathParts = currentPath.split("/");
            currentPath = path_1.default.join(pathParts[pathParts.length - 2], pathParts[pathParts.length - 1]);
            if (currentPath.includes("openzeppelin") ||
                currentPath.includes("forge") ||
                currentPath.endsWith(".t.sol") ||
                currentPath.endsWith(".s.sol") ||
                currentPath.includes("solady")) {
                currentPath = "";
                return;
            }
            fileDataMap[currentPath] = [];
        }
        else if (currentPath) {
            fileDataMap[currentPath].push(line);
        }
    });
    return Object.keys(fileDataMap).map((filePath) => {
        const functionBlocks = parseFunctions(fileDataMap[filePath], allFunctions);
        const lineData = functionBlocks.map((fb) => ({
            functionName: fb.name,
            touched: fb.isTouched,
            reverted: fb.isReverted,
            isFullyCovered: fb.isTotallyCovered,
            untouchedLines: fb.untouchedLines,
            revertedContent: fb.revertedContent,
            untouchedContent: fb.untouchedContent,
        }));
        return {
            path: filePath,
            data: lineData,
            coverage: calculateCoverage(functionBlocks),
        };
    });
}
function readFileAndProcess(filePath, allFunctions) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return processFileContent(fileContent, allFunctions);
}
const checkViewOrPureFunction = (content) => {
    const words = content
        .toLowerCase()
        .split(/[\s(),]+/)
        .map((word) => word.trim())
        .filter((word) => word);
    // Check for view/pure modifiers
    if (words.includes("view") || words.includes("pure")) {
        return true;
    }
    else {
        return false;
    }
};
