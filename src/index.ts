#!/usr/bin/env node

import { parseArgs } from "./args";
import { readFileAndProcess } from "./parsing";
import { style, ICONS } from "./style";
import { checkLatestVersion, parseScopeFile, getContractNameFromPath } from "./utils";
import * as fs from "fs";
import * as path from "path";
import { FileDataWithCoverage, ScopeContract } from "./types/types";

const resolvePathFromCwd = (inputPath: string): string => {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(process.cwd(), inputPath);
};

const calculateAggregateCoverage = (
  results: FileDataWithCoverage[],
  scopeContracts: ScopeContract[]
): { totalCoveredLines: number; totalUntouchedLines: number; totalPercentage: number; contractsInScope: number; contractsCovered: number } => {
  // Create a set of contract names from scope
  const scopeContractNames = new Set(
    scopeContracts.map((sc) => getContractNameFromPath(sc.path))
  );

  // Filter results to only include contracts in scope
  const scopedResults = results.filter((result) => {
    const contractName = path.basename(result.path);
    return scopeContractNames.has(contractName);
  });

  // Aggregate coverage stats
  const totalCoveredLines = scopedResults.reduce(
    (sum, result) => sum + result.coverage.coveredLines,
    0
  );
  const totalUntouchedLines = scopedResults.reduce(
    (sum, result) => sum + result.coverage.untouchedLines,
    0
  );

  const totalLines = totalCoveredLines + totalUntouchedLines;
  const totalPercentage =
    totalLines === 0 ? 0 : Number(((totalCoveredLines / totalLines) * 100).toFixed(2));

  return {
    totalCoveredLines,
    totalUntouchedLines,
    totalPercentage,
    contractsInScope: scopeContractNames.size,
    contractsCovered: scopedResults.length,
  };
};

const main = async () => {
  const options = parseArgs();
  const version = require("../package.json").version;
  console.log(`Running Echidna coverage version ${version}`);
  await checkLatestVersion(version);

  let result: FileDataWithCoverage[] = [];
  if (options.filePath) {
    result = readFileAndProcess(options.filePath, options.allFunctions, options.sourceOnly, options.logical, options.exclude);
  } else if (options.echidnaFolder) {
    const resolvedFolder = resolvePathFromCwd(options.echidnaFolder);
    let echidnaPath = `${resolvedFolder}${
      resolvedFolder.endsWith("/") ? "echidna" : "/echidna"
    }`;

    // Try echidna folder first, then corpusDir
    if (!fs.existsSync(echidnaPath)) {
      const corpusDirPath = `${resolvedFolder}${
        resolvedFolder.endsWith("/") ? "corpusDir" : "/corpusDir"
      }`;
      if (!fs.existsSync(corpusDirPath)) {
        console.log(
          style.error(`${ICONS.ERROR} No echidna or corpusDir folder found in`)
        );
        return;
      }
      echidnaPath = corpusDirPath;
    }

    let files: { name: string; path: string; ctime: Date }[] = [];
    try {
      files = fs
        .readdirSync(echidnaPath)
        .filter((file) => file.endsWith(".txt"))
        .map((file) => ({
          name: file,
          path: path.join(echidnaPath!, file),
          ctime: fs.statSync(path.join(echidnaPath!, file)).ctime,
        }))
        .sort((a, b) => b.ctime.getTime() - a.ctime.getTime());
    } catch {
      console.log("Error in path");
    }

    if (files.length === 0) {
      console.log("No files found in echidna folder");
      return;
    }

    options.filePath = files[0].path;
    result = readFileAndProcess(options.filePath, options.allFunctions, options.sourceOnly, options.logical, options.exclude);
  } else {
    throw new Error("No file or folder provided");
  }

  if (options.contract) {
    if (options.contract.includes("[") && options.contract.includes("]")) {
      let temp: FileDataWithCoverage[] = [];
      const contractArray = options.contract.replace("[", "").replace("]", "").split(",");

      contractArray.map((contract) => {
        const found = result.filter((file) =>
          file.path.toLowerCase().includes(contract.trim().toLowerCase())
        );
        temp.push(...found);
      });

      result = temp;
    } else {
      result = result.filter((file) =>
        file.path.toLowerCase().includes(options.contract!.toLowerCase())
      );
    }
  }

  // When using source-only with scope file, filter to only scoped contracts
  if (options.sourceOnly && options.scopeFile) {
    const scopeContracts = parseScopeFile(options.scopeFile);
    if (scopeContracts.length > 0) {
      const scopeContractNames = new Set(
        scopeContracts.map((sc) => getContractNameFromPath(sc.path))
      );
      result = result.filter((file) => {
        const contractName = path.basename(file.path);
        return scopeContractNames.has(contractName);
      });
    }
  }

  result.forEach((data) => {
    console.log("\n");
    console.log(style.dim("═".repeat(50)));
    console.log(style.header(`${ICONS.FILE} File: ${data.path}`));
    console.log(style.dim("═".repeat(50)));

    if (options.outputFormat === "json") {
      console.log(JSON.stringify(data.coverage, null, 2));
    } else {
      if (options.condensedMode) {
        console.log(`${data.coverage.lineCoveragePercentage} %`)
        return
      }
      if (
        data.coverage.lineCoveragePercentage === 0 &&
        data.coverage.coveredLines === 0 &&
        !options.verbose
      ) {
        console.log(style.error(`\n${ICONS.ERROR} File totaly uncovered`));
        return;
      } else {
        console.table(data.coverage);
      }

      // Always show uncovered functions (not just in verbose mode)
      let uncoveredFunctions = data.data.filter((d) => !d.isFullyCovered);
      if (uncoveredFunctions.length > 0) {
        console.log(
          style.warning(`\n${ICONS.WARNING} Not fully covered functions:`)
        );
        console.table(
          uncoveredFunctions.map((d) => ({
            functionName: d.functionName,
            touched: d.touched,
            reverted: d.reverted,
            untouchedLines: d.untouchedLines,
          }))
        );

        // Show detailed uncovered/reverted lines only in very verbose mode
        if (options.veryVerbose) {
          uncoveredFunctions.forEach((f) => {
            if (
              f.untouchedContent.length > 0 ||
              f.revertedContent.length > 0
            ) {
              console.log(style.header(`\nFunction: ${f.functionName}`));
            }
            if (f.untouchedContent.length > 0) {
              console.log(style.error(`${ICONS.ERROR} Untouched lines:`));
              f.untouchedContent.forEach((line) => {
                console.log(style.dim(line));
              });
            }
            if (f.revertedContent.length > 0) {
              console.log(
                style.warning(`\n${ICONS.WARNING} Reverted lines:`)
              );
              f.revertedContent.forEach((line) => {
                console.log(style.dim(line));
              });
            }
          });
        }
      }
    }

    if (data.coverage.lineCoveragePercentage < options.threshold) {
      console.log(
        style.error(
          `\n${ICONS.ERROR} Warning: Coverage ${data.coverage.lineCoveragePercentage}% below threshold ${options.threshold}%`
        )
      );
    }

    console.log(style.dim("═".repeat(50)));
  });

  // Display aggregate coverage if scope file is provided
  if (options.scopeFile) {
    const scopeContracts = parseScopeFile(options.scopeFile);

    if (scopeContracts.length > 0) {
      const aggregateStats = calculateAggregateCoverage(result, scopeContracts);

      console.log("\n");
      console.log(style.dim("═".repeat(50)));
      console.log(style.header(`${ICONS.FILE} TOTAL COVERAGE (Scoped Contracts)`));
      console.log(style.dim("═".repeat(50)));

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
        console.log(
          style.error(
            `\n${ICONS.ERROR} Warning: Total coverage ${aggregateStats.totalPercentage}% below threshold ${options.threshold}%`
          )
        );
      } else {
        console.log(
          style.success(
            `\n✓ Total coverage meets threshold (${aggregateStats.totalPercentage}% >= ${options.threshold}%)`
          )
        );
      }

      console.log(style.dim("═".repeat(50)));
    }
  }
};

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
