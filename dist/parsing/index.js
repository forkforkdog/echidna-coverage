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
    // Track compiler-active lines outside any function body (contract declaration,
    // state variable declarations/initializations, etc.)
    const contractLevel = {
        name: "<contract-level>",
        lines: [],
        isTouched: false,
        isReverted: false,
        coveredLines: 0,
        untouchedLines: 0,
        revertedLines: 0,
        isTotallyCovered: false,
        revertedContent: [],
        untouchedContent: [],
        totalLines: 0,
        isViewPure: false,
        logicalCoveredLines: 0,
        logicalUntouchedLines: 0,
    };
    lines.forEach((line, index) => {
        const parts = line.split("|").map((part) => part.trim());
        if (parts.length < 3)
            return;
        // Echidna coverage format has 4 columns: lineNo | hitCount | marker | content
        // - parts[0] = line number
        // - parts[1] = hit count (number if compiler-instrumented, empty if not active)
        // - parts[2] = marker (* = covered, r = reverted, empty = untouched)
        // - parts[3] = source code content
        // A line is compiler-active ONLY if parts[1] is non-empty (has a hit count, even "0").
        // Lines with empty parts[1] are NOT instrumented by the compiler and must not be counted.
        const hasHitCount = parts.length >= 4;
        const hitCountCol = hasHitCount ? parts[1] : "";
        const markerCol = hasHitCount ? parts[2] : parts[1];
        const content = hasHitCount ? parts[3] : parts[2];
        const isCompilerActive = hitCountCol !== "";
        const functionMatch = content.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        // Also match constructor, modifier, receive, fallback as function-like blocks
        const constructorMatch = !functionMatch ? content.match(/\b(constructor|modifier\s+([a-zA-Z_][a-zA-Z0-9_]*))\s*\(/) : null;
        const receiveMatch = (!functionMatch && !constructorMatch) ? content.match(/\b(receive|fallback)\s*\(\s*\)/) : null;
        const isAnyFunctionLike = functionMatch || constructorMatch || receiveMatch;
        // Count compiler-active lines outside any function body
        // Exclude function-like declaration lines (they'll be counted when the body starts)
        if (!currentFunction && isCompilerActive && !isAnyFunctionLike) {
            contractLevel.totalLines++;
            if (markerCol === "*") {
                contractLevel.coveredLines++;
                contractLevel.isTouched = true;
            }
            else if (markerCol === "r") {
                contractLevel.revertedLines++;
                contractLevel.revertedContent.push(content);
                contractLevel.isReverted = true;
                contractLevel.isTouched = true;
            }
            else {
                contractLevel.untouchedLines++;
                contractLevel.untouchedContent.push(content);
            }
        }
        // Check for function start (including constructors, modifiers, receive, fallback)
        if (isAnyFunctionLike) {
            bracketCount = 0;
            functionBodyStarted = false;
            isViewPure = functionMatch ? checkViewOrPureFunction(content) : false;
            let blockName;
            if (functionMatch) {
                blockName = functionMatch[1];
            }
            else if (constructorMatch) {
                blockName = constructorMatch[2] ? `modifier_${constructorMatch[2]}` : "constructor";
            }
            else {
                blockName = receiveMatch[1]; // "receive" or "fallback"
            }
            currentFunction = {
                name: blockName,
                lines: [],
                isTouched: false,
                isReverted: false,
                coveredLines: 0,
                untouchedLines: 0,
                revertedLines: 0,
                isTotallyCovered: false,
                revertedContent: [],
                untouchedContent: [],
                totalLines: 0,
                isViewPure: isViewPure,
                logicalCoveredLines: 0,
                logicalUntouchedLines: 0,
            };
        }
        // Check lines between function declaration and opening brace for view/external
        if (currentFunction && !functionBodyStarted) {
            if (checkViewOrPureFunction(content)) {
                currentFunction.isViewPure = checkViewOrPureFunction(content);
            }
            // Count compiler-active function declaration lines (where { is on a later line)
            // Skip lines that contain { — those are handled by the opening brace handler below
            if (isCompilerActive && !content.includes("{")) {
                if (markerCol === "*") {
                    currentFunction.coveredLines++;
                    currentFunction.isTouched = true;
                    if (isLogicalLine(content)) {
                        currentFunction.logicalCoveredLines++;
                    }
                }
                else if (markerCol === "r") {
                    currentFunction.revertedLines++;
                    currentFunction.revertedContent.push(content);
                    currentFunction.isReverted = true;
                    currentFunction.isTouched = true;
                    if (isLogicalLine(content)) {
                        currentFunction.logicalCoveredLines++;
                    }
                }
                else {
                    currentFunction.untouchedLines++;
                    currentFunction.untouchedContent.push(content);
                    if (isLogicalLine(content)) {
                        currentFunction.logicalUntouchedLines++;
                    }
                }
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
            const openBraces = (content.match(/\{/g) || []).length;
            const closeBraces = (content.match(/\}/g) || []).length;
            if (openBraces > 0) {
                bracketCount += openBraces;
                if (bracketCount >= 1 && !functionBodyStarted) {
                    functionBodyStarted = true;
                    // Count the function declaration / opening brace line if compiler-active
                    if (isCompilerActive) {
                        if (markerCol === "*") {
                            currentFunction.coveredLines++;
                            currentFunction.isTouched = true;
                            if (isLogicalLine(content)) {
                                currentFunction.logicalCoveredLines++;
                            }
                        }
                        else if (markerCol === "r") {
                            currentFunction.revertedLines++;
                            currentFunction.revertedContent.push(content);
                            currentFunction.isReverted = true;
                            currentFunction.isTouched = true;
                            if (isLogicalLine(content)) {
                                currentFunction.logicalCoveredLines++;
                            }
                        }
                        else {
                            currentFunction.untouchedLines++;
                            currentFunction.untouchedContent.push(content);
                            if (isLogicalLine(content)) {
                                currentFunction.logicalUntouchedLines++;
                            }
                        }
                    }
                    return;
                }
            }
            if (functionBodyStarted) {
                // Use compiler instrumentation to determine line activity.
                // A line is active (executable) only if the compiler assigned it a hit count
                // (parts[1] is non-empty, even if "0"). Lines without a hit count are structural
                // (declarations, comments, formatting) and must not be counted.
                if (trimmedContent === "assembly {") {
                    // For assembly blocks: if the assembly { line itself is compiler-active,
                    // use its own marker. Otherwise, fall back to the next line's marker.
                    let effectiveMarker = markerCol;
                    if (!isCompilerActive && index + 1 < lines.length) {
                        const nextLineParts = lines[index + 1]
                            .split("|")
                            .map((part) => part.trim());
                        effectiveMarker = nextLineParts.length >= 4 ? nextLineParts[2] : nextLineParts[1];
                    }
                    if (isCompilerActive || (index + 1 < lines.length)) {
                        if (effectiveMarker === "*") {
                            currentFunction.coveredLines++;
                            currentFunction.isTouched = true;
                            if (isLogicalLine(content)) {
                                currentFunction.logicalCoveredLines++;
                            }
                        }
                        else if (effectiveMarker === "r") {
                            currentFunction.revertedLines++;
                            currentFunction.revertedContent.push(content);
                            currentFunction.isReverted = true;
                            currentFunction.isTouched = true;
                            if (isLogicalLine(content)) {
                                currentFunction.logicalCoveredLines++;
                            }
                        }
                        else if (isCompilerActive) {
                            currentFunction.untouchedLines++;
                            currentFunction.untouchedContent.push(content);
                            if (isLogicalLine(content)) {
                                currentFunction.logicalUntouchedLines++;
                            }
                        }
                    }
                }
                else if (trimmedContent === "}") {
                    // Don't count closing brace
                    null;
                }
                else if (markerCol === "*") {
                    // Line is covered (executed successfully)
                    currentFunction.coveredLines++;
                    currentFunction.isTouched = true;
                    if (isLogicalLine(content)) {
                        currentFunction.logicalCoveredLines++;
                    }
                }
                else if (markerCol === "r") {
                    // Line was executed but reverted
                    currentFunction.revertedLines++;
                    currentFunction.revertedContent.push(content);
                    currentFunction.isReverted = true;
                    currentFunction.isTouched = true;
                    if (isLogicalLine(content)) {
                        currentFunction.logicalCoveredLines++;
                    }
                }
                else if (isCompilerActive) {
                    // Line is compiler-instrumented (has a hit count, even "0") but was not
                    // executed. This is a genuinely uncovered executable line.
                    currentFunction.untouchedLines++;
                    currentFunction.untouchedContent.push(content);
                    if (isLogicalLine(content)) {
                        currentFunction.logicalUntouchedLines++;
                    }
                }
                // Lines where isCompilerActive is false are NOT instrumented by the compiler
                // (no hit count). These are structural lines (declarations, formatting,
                // multi-line continuations) and are intentionally not counted.
            }
            if (closeBraces > 0) {
                bracketCount -= closeBraces;
                if (bracketCount <= 0 && currentFunction) {
                    functions.push(currentFunction);
                    currentFunction = null;
                    functionBodyStarted = false;
                }
            }
        }
    });
    // Add contract-level lines if any were found
    if (contractLevel.coveredLines > 0 || contractLevel.untouchedLines > 0 || contractLevel.revertedLines > 0) {
        if (contractLevel.coveredLines > 0 && contractLevel.untouchedLines === 0 && contractLevel.revertedLines === 0) {
            contractLevel.isTotallyCovered = true;
        }
        functions.push(contractLevel);
    }
    functions.map((f) => {
        if (f.coveredLines > 0 && f.untouchedLines === 0 && f.revertedLines === 0) {
            f.isTotallyCovered = true;
        }
    });
    if (allFunctions) {
        return functions;
    }
    else {
        // Filter out view/pure functions
        const filteredFunctions = functions.filter((f) => !f.isViewPure);
        // If filtering results in zero functions but we had functions before,
        // return all functions (contract only has view/pure functions)
        if (filteredFunctions.length === 0 && functions.length > 0) {
            return functions;
        }
        return filteredFunctions;
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
function isLogicalLine(content) {
    const trimmedContent = content.trim();
    // Skip empty lines
    if (trimmedContent === "")
        return false;
    // Skip comments
    if (trimmedContent.startsWith("//") ||
        trimmedContent.startsWith("/*") ||
        trimmedContent.startsWith("*") ||
        trimmedContent.endsWith("*/"))
        return false;
    // Skip isolated brackets
    if (trimmedContent === "{" ||
        trimmedContent === "}" ||
        trimmedContent === "(" ||
        trimmedContent === ")" ||
        trimmedContent === ");" ||
        trimmedContent === "} else {" ||
        trimmedContent === "});")
        return false;
    // Skip import/pragma statements
    if (trimmedContent.startsWith("import ") ||
        trimmedContent.startsWith("pragma "))
        return false;
    // Skip struct/enum/interface/contract/library/event definitions (headers only)
    if (trimmedContent.match(/^(struct|enum|interface|contract|library|event|error)\s+\w+/) &&
        !trimmedContent.includes("(") // Skip if it's just the declaration
    )
        return false;
    // Skip modifier/visibility keywords alone
    if (trimmedContent.match(/^(public|private|internal|external|view|pure|payable|override|virtual)\s*$/))
        return false;
    // Skip simple variable/mapping/array declarations without initialization
    if (trimmedContent.match(/^(uint|int|bool|address|bytes|string|mapping|[A-Z]\w*)\s+\w+;$/) ||
        trimmedContent.match(/^(uint|int|bool|address|bytes|string)\d*\s+\w+;$/))
        return false;
    // Include everything else (assignments, function calls, returns, requires, etc.)
    return true;
}
function calculateCoverage(functions, useLogical = false) {
    const totalFunctions = functions.length;
    const coveredFunctions = functions.filter((f) => f.isTotallyCovered).length;
    let coveredLines;
    let totalUntouchedLines;
    if (useLogical) {
        // Use logical coverage metrics
        coveredLines = functions.reduce((acc, f) => acc + f.logicalCoveredLines, 0);
        totalUntouchedLines = functions.reduce((acc, f) => acc + f.logicalUntouchedLines, 0);
    }
    else {
        // Use standard coverage metrics
        coveredLines = functions.reduce((acc, f) => acc + f.coveredLines, 0);
        totalUntouchedLines = functions.reduce((acc, f) => acc + f.untouchedLines, 0);
    }
    const revertedFunctions = functions.filter((f) => f.isReverted).length;
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
function processFileContent(fileContent, allFunctions, sourceOnly = false, logical = false, exclude) {
    const lines = fileContent.split("\n");
    const fileDataMap = {};
    let currentPath = "";
    // First, group lines by file
    lines.forEach((line) => {
        const pathMatch = line.match(/^\/.*\/.*$/);
        if (pathMatch) {
            const fullPath = pathMatch[0];
            const pathParts = fullPath.split("/");
            currentPath = path_1.default.join(pathParts[pathParts.length - 2], pathParts[pathParts.length - 1]);
            // Default exclusions (check shortened path and full path for interfaces)
            const lowerFullPath = fullPath.toLowerCase();
            const fileName = path_1.default.basename(fullPath);
            // Smart interface detection: files matching I[CapitalLetter]*.sol pattern
            const isInterfaceByNaming = fileName.length > 1 &&
                fileName.startsWith("I") &&
                fileName[1] === fileName[1].toUpperCase() &&
                fileName[1] !== fileName[1].toLowerCase() &&
                fileName.endsWith(".sol");
            // Hardcoded exclusions for common libraries and test files
            if (currentPath.includes("openzeppelin") ||
                currentPath.includes("forge") ||
                currentPath.endsWith(".t.sol") ||
                currentPath.endsWith(".s.sol") ||
                currentPath.includes("solady") ||
                lowerFullPath.includes("/interfaces/") ||
                lowerFullPath.includes("/interface/") ||
                lowerFullPath.includes("/forge-std/") ||
                lowerFullPath.includes("/lib/forge-std/") ||
                lowerFullPath.includes("/fuzzlib/") ||
                lowerFullPath.includes("/lib/fuzzlib/") ||
                isInterfaceByNaming) {
                currentPath = "";
                return;
            }
            // Check --exclude flag for specific interface names
            if (exclude) {
                const fileName = path_1.default.basename(fullPath);
                const excludeList = exclude
                    .replace(/[\[\]]/g, "")
                    .split(",")
                    .map((name) => name.trim());
                for (const excludeName of excludeList) {
                    // Match exact filename with .sol extension
                    const nameToMatch = excludeName.endsWith(".sol") ? excludeName : `${excludeName}.sol`;
                    if (fileName === nameToMatch) {
                        currentPath = "";
                        return;
                    }
                }
            }
            // Additional exclusions for --source-only flag (check FULL path)
            if (sourceOnly) {
                const lowerFullPath = fullPath.toLowerCase();
                if (lowerFullPath.includes("/fuzzing/") ||
                    lowerFullPath.includes("/test/")) {
                    currentPath = "";
                    return;
                }
            }
            // Filter for --logical flag: only include logicalCoverage/logical*.sol files
            if (logical) {
                const normalizedFullPath = fullPath.replace(/\\/g, '/');
                const hasLogicalFolder = normalizedFullPath.includes("/logicalCoverage/");
                const fileName = path_1.default.basename(fullPath);
                const isLogicalFile = fileName.startsWith("logical") && fileName.endsWith(".sol");
                if (!(hasLogicalFolder && isLogicalFile)) {
                    currentPath = "";
                    return;
                }
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
            coverage: calculateCoverage(functionBlocks, false),
        };
    });
}
function readFileAndProcess(filePath, allFunctions, sourceOnly = false, logical = false, exclude) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return processFileContent(fileContent, allFunctions, sourceOnly, logical, exclude);
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
