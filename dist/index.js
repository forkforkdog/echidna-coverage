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
Object.defineProperty(exports, "__esModule", { value: true });
const args_1 = require("./args");
const parsing_1 = require("./parsing");
const style_1 = require("./style");
const utils_1 = require("./utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const resolvePathFromCwd = (inputPath) => {
    if (path.isAbsolute(inputPath)) {
        return inputPath;
    }
    return path.resolve(process.cwd(), inputPath);
};
const calculateAggregateCoverage = (results, scopeContracts) => {
    // Create a set of contract names from scope
    const scopeContractNames = new Set(scopeContracts.map((sc) => (0, utils_1.getContractNameFromPath)(sc.path)));
    // Filter results to only include contracts in scope
    const scopedResults = results.filter((result) => {
        const contractName = path.basename(result.path);
        return scopeContractNames.has(contractName);
    });
    // Aggregate coverage stats
    const totalCoveredLines = scopedResults.reduce((sum, result) => sum + result.coverage.coveredLines, 0);
    const totalUntouchedLines = scopedResults.reduce((sum, result) => sum + result.coverage.untouchedLines, 0);
    const totalLines = totalCoveredLines + totalUntouchedLines;
    const totalPercentage = totalLines === 0 ? 0 : Number(((totalCoveredLines / totalLines) * 100).toFixed(2));
    return {
        totalCoveredLines,
        totalUntouchedLines,
        totalPercentage,
        contractsInScope: scopeContractNames.size,
        contractsCovered: scopedResults.length,
    };
};
const main = async () => {
    const options = (0, args_1.parseArgs)();
    const version = require("../package.json").version;
    console.log(`Running Echidna coverage version ${version}`);
    await (0, utils_1.checkLatestVersion)(version);
    let result = [];
    if (options.filePath) {
        result = (0, parsing_1.readFileAndProcess)(options.filePath, options.allFunctions, options.sourceOnly, options.logical, options.exclude);
    }
    else if (options.echidnaFolder) {
        const resolvedFolder = resolvePathFromCwd(options.echidnaFolder);
        let echidnaPath = `${resolvedFolder}${resolvedFolder.endsWith("/") ? "echidna" : "/echidna"}`;
        // Try echidna folder first, then corpusDir
        if (!fs.existsSync(echidnaPath)) {
            const corpusDirPath = `${resolvedFolder}${resolvedFolder.endsWith("/") ? "corpusDir" : "/corpusDir"}`;
            if (!fs.existsSync(corpusDirPath)) {
                console.log(style_1.style.error(`${style_1.ICONS.ERROR} No echidna or corpusDir folder found in`));
                return;
            }
            echidnaPath = corpusDirPath;
        }
        let files = [];
        try {
            files = fs
                .readdirSync(echidnaPath)
                .filter((file) => file.endsWith(".txt"))
                .map((file) => ({
                name: file,
                path: path.join(echidnaPath, file),
                ctime: fs.statSync(path.join(echidnaPath, file)).ctime,
            }))
                .sort((a, b) => b.ctime.getTime() - a.ctime.getTime());
        }
        catch (_a) {
            console.log("Error in path");
        }
        if (files.length === 0) {
            console.log("No files found in echidna folder");
            return;
        }
        options.filePath = files[0].path;
        result = (0, parsing_1.readFileAndProcess)(options.filePath, options.allFunctions, options.sourceOnly, options.logical, options.exclude);
    }
    else {
        throw new Error("No file or folder provided");
    }
    if (options.contract) {
        if (options.contract.includes("[") && options.contract.includes("]")) {
            let temp = [];
            const contractArray = options.contract.replace("[", "").replace("]", "").split(",");
            contractArray.map((contract) => {
                const found = result.filter((file) => file.path.toLowerCase().includes(contract.trim().toLowerCase()));
                temp.push(...found);
            });
            result = temp;
        }
        else {
            result = result.filter((file) => file.path.toLowerCase().includes(options.contract.toLowerCase()));
        }
    }
    result.forEach((data) => {
        console.log("\n");
        console.log(style_1.style.dim("═".repeat(50)));
        console.log(style_1.style.header(`${style_1.ICONS.FILE} File: ${data.path}`));
        console.log(style_1.style.dim("═".repeat(50)));
        if (options.outputFormat === "json") {
            console.log(JSON.stringify(data.coverage, null, 2));
        }
        else {
            if (options.condensedMode) {
                console.log(`${data.coverage.lineCoveragePercentage} %`);
                return;
            }
            if (data.coverage.lineCoveragePercentage === 0 &&
                data.coverage.coveredLines === 0 &&
                !options.verbose) {
                console.log(style_1.style.error(`\n${style_1.ICONS.ERROR} File totaly uncovered`));
                return;
            }
            else {
                console.table(data.coverage);
            }
            if (options.verbose) {
                let uncoveredFunctions = data.data.filter((d) => !d.isFullyCovered);
                if (uncoveredFunctions.length > 0) {
                    console.log(style_1.style.warning(`\n${style_1.ICONS.WARNING} Not fully covered functions:`));
                    console.table(uncoveredFunctions.map((d) => ({
                        functionName: d.functionName,
                        touched: d.touched,
                        reverted: d.reverted,
                        untouchedLines: d.untouchedLines,
                    })));
                    if (options.veryVerbose) {
                        uncoveredFunctions.forEach((f) => {
                            if (f.untouchedContent.length > 0 ||
                                f.revertedContent.length > 0) {
                                console.log(style_1.style.header(`\nFunction: ${f.functionName}`));
                            }
                            if (f.untouchedContent.length > 0) {
                                console.log(style_1.style.error(`${style_1.ICONS.ERROR} Untouched lines:`));
                                f.untouchedContent.forEach((line) => {
                                    console.log(style_1.style.dim(line));
                                });
                            }
                            if (f.revertedContent.length > 0) {
                                console.log(style_1.style.warning(`\n${style_1.ICONS.WARNING} Reverted lines:`));
                                f.revertedContent.forEach((line) => {
                                    console.log(style_1.style.dim(line));
                                });
                            }
                        });
                    }
                }
            }
        }
        if (data.coverage.lineCoveragePercentage < options.threshold) {
            console.log(style_1.style.error(`\n${style_1.ICONS.ERROR} Warning: Coverage ${data.coverage.lineCoveragePercentage}% below threshold ${options.threshold}%`));
        }
        console.log(style_1.style.dim("═".repeat(50)));
    });
    // Display aggregate coverage if scope file is provided
    if (options.scopeFile) {
        const scopeContracts = (0, utils_1.parseScopeFile)(options.scopeFile);
        if (scopeContracts.length > 0) {
            const aggregateStats = calculateAggregateCoverage(result, scopeContracts);
            console.log("\n");
            console.log(style_1.style.dim("═".repeat(50)));
            console.log(style_1.style.header(`${style_1.ICONS.FILE} TOTAL COVERAGE (Scoped Contracts)`));
            console.log(style_1.style.dim("═".repeat(50)));
            const summaryData = {
                "Contracts in Scope": aggregateStats.contractsInScope,
                "Contracts Covered": aggregateStats.contractsCovered,
                "Total Covered Lines": aggregateStats.totalCoveredLines,
                "Total Untouched Lines": aggregateStats.totalUntouchedLines,
                "Total Lines": aggregateStats.totalCoveredLines + aggregateStats.totalUntouchedLines,
                "Total Coverage %": `${aggregateStats.totalPercentage}%`,
            };
            console.table(summaryData);
            if (aggregateStats.totalPercentage < options.threshold) {
                console.log(style_1.style.error(`\n${style_1.ICONS.ERROR} Warning: Total coverage ${aggregateStats.totalPercentage}% below threshold ${options.threshold}%`));
            }
            else {
                console.log(style_1.style.success(`\n✓ Total coverage meets threshold (${aggregateStats.totalPercentage}% >= ${options.threshold}%)`));
            }
            console.log(style_1.style.dim("═".repeat(50)));
        }
    }
};
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
