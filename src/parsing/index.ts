import path from "path";
import * as fs from "fs";
import {
  FunctionBlock,
  CoverageStats,
  FileDataWithCoverage,
  LineData,
} from "../types/types";

function parseFunctions(lines: string[], allFunctions: boolean): FunctionBlock[] {
  const functions: FunctionBlock[] = [];
  let currentFunction: FunctionBlock | null = null;
  let bracketCount = 0;
  let functionBodyStarted = false;
  let isViewPure = false;
  let commentTracker = false;

  lines.forEach((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3) return;

    const content = parts[2];
    const functionMatch = content.match(
      /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/
    );

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
        logicalCoveredLines: 0,
        logicalUntouchedLines: 0,
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
            if (isLogicalLine(content)) {
              currentFunction.logicalCoveredLines++;
            }
          } else if (nextParts[1] === "r") {
            currentFunction.revertedLines++;
            currentFunction.revertedContent.push(content);
            currentFunction.isReverted = true;
            currentFunction.isTouched = true;
            if (isLogicalLine(content)) {
              currentFunction.logicalCoveredLines++;
            }
          } else if (nextParts[1] === "" && isUntouchedLine(content)) {
            currentFunction.untouchedLines++;
            currentFunction.untouchedContent.push(content);
            if (isLogicalLine(content)) {
              currentFunction.logicalUntouchedLines++;
            }
          }
        } else if (trimmedContent === "}") {
          // Don't count closing brace
          null;
        } else if (parts[1] === "*") {
          currentFunction.coveredLines++;
          currentFunction.isTouched = true;
          // Track logical coverage
          if (isLogicalLine(content)) {
            currentFunction.logicalCoveredLines++;
          }
        } else if (parts[1] === "r") {
          currentFunction.revertedLines++;
          currentFunction.revertedContent.push(content);
          currentFunction.isReverted = true;
          currentFunction.isTouched = true;
          // Track logical coverage for reverted lines
          if (isLogicalLine(content)) {
            currentFunction.logicalCoveredLines++;
          }
        } else if (parts[1] === "" && isUntouchedLine(content)) {
          if (
            lines[index - 1]
              .split("|")
              .map((part) => part.trim())[2]
              .endsWith(",") ||
            content.startsWith('"') ||
            (lines[index - 1].split("|").map((part) => part.trim())[1] ===
              "*" &&
              lines[index + 1].split("|").map((part) => part.trim())[1] === "*")
          ) {
            currentFunction.coveredLines++;
            currentFunction.isTouched = true;
            // Track logical coverage
            if (isLogicalLine(content)) {
              currentFunction.logicalCoveredLines++;
            }
          } else {
            currentFunction.untouchedLines++;
            currentFunction.untouchedContent.push(content);
            // Track logical coverage
            if (isLogicalLine(content)) {
              currentFunction.logicalUntouchedLines++;
            }
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
  } else {
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

function isUntouchedLine(content: string): boolean {
  const trimmedContent = content.trim();

  // Skip empty lines
  if (trimmedContent === "") return false;

  // Skip function declarations and structural elements
  if (
    trimmedContent.startsWith("function") ||
    trimmedContent === "{" ||
    trimmedContent === "}" ||
    trimmedContent.includes(") {") ||
    trimmedContent === ");" ||
    trimmedContent.trim() === "} catch {" ||
    trimmedContent.trim() === "});" ||
    trimmedContent.startsWith("console")
  )
    return false;

  // Skip visibility keywords
  if (
    trimmedContent.includes("public") ||
    trimmedContent.includes("private") ||
    trimmedContent.includes("external") ||
    trimmedContent.includes("internal") ||
    trimmedContent.includes("view")
  )
    return false;

  // Standalone brackets
  if (trimmedContent === "(" || trimmedContent === ")") return false;

  // Skip else blocks
  if (trimmedContent === "} else {") return false;

  // Handle comments - don't skip single line comments
  if (
    trimmedContent.startsWith("/*") ||
    trimmedContent.startsWith("*") ||
    trimmedContent.startsWith("//")
  )
    return false;

  return true;
}

function isLogicalLine(content: string): boolean {
  const trimmedContent = content.trim();

  // Skip empty lines
  if (trimmedContent === "") return false;

  // Skip comments
  if (
    trimmedContent.startsWith("//") ||
    trimmedContent.startsWith("/*") ||
    trimmedContent.startsWith("*") ||
    trimmedContent.endsWith("*/")
  )
    return false;

  // Skip isolated brackets
  if (
    trimmedContent === "{" ||
    trimmedContent === "}" ||
    trimmedContent === "(" ||
    trimmedContent === ")" ||
    trimmedContent === ");" ||
    trimmedContent === "} else {" ||
    trimmedContent === "});"
  )
    return false;

  // Skip import/pragma statements
  if (
    trimmedContent.startsWith("import ") ||
    trimmedContent.startsWith("pragma ")
  )
    return false;

  // Skip struct/enum/interface/contract/library/event definitions (headers only)
  if (
    trimmedContent.match(/^(struct|enum|interface|contract|library|event|error)\s+\w+/) &&
    !trimmedContent.includes("(") // Skip if it's just the declaration
  )
    return false;

  // Skip modifier/visibility keywords alone
  if (
    trimmedContent.match(/^(public|private|internal|external|view|pure|payable|override|virtual)\s*$/)
  )
    return false;

  // Skip simple variable/mapping/array declarations without initialization
  if (
    trimmedContent.match(/^(uint|int|bool|address|bytes|string|mapping|[A-Z]\w*)\s+\w+;$/) ||
    trimmedContent.match(/^(uint|int|bool|address|bytes|string)\d*\s+\w+;$/)
  )
    return false;

  // Include everything else (assignments, function calls, returns, requires, etc.)
  return true;
}

function calculateCoverage(functions: FunctionBlock[], useLogical: boolean = false): CoverageStats {
  const totalFunctions = functions.length;
  const coveredFunctions = functions.filter((f) => f.isTotallyCovered).length;

  let coveredLines: number;
  let totalUntouchedLines: number;

  if (useLogical) {
    // Use logical coverage metrics
    coveredLines = functions.reduce((acc, f) => acc + f.logicalCoveredLines, 0);
    totalUntouchedLines = functions.reduce(
      (acc, f) => acc + f.logicalUntouchedLines,
      0
    );
  } else {
    // Use standard coverage metrics
    coveredLines = functions.reduce((acc, f) => acc + f.coveredLines, 0);
    totalUntouchedLines = functions.reduce(
      (acc, f) => acc + f.untouchedLines,
      0
    );
  }

  const revertedFunctions = functions.filter((f) => f.isReverted).length;
  const functionCoveragePercentage =
    coveredFunctions === 0 && totalFunctions === 0
      ? 0
      : Number(((coveredFunctions / totalFunctions) * 100).toFixed(2));

  const lineCoveragePercentage =
    coveredLines === 0 && totalUntouchedLines === 0
      ? 0
      : Number(
          ((coveredLines / (coveredLines + totalUntouchedLines)) * 100).toFixed(
            2
          )
        );
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

function processFileContent(fileContent: string, allFunctions: boolean, sourceOnly: boolean = false, logical: boolean = false, exclude?: string): FileDataWithCoverage[] {
  const lines = fileContent.split("\n");
  const fileDataMap: { [key: string]: string[] } = {};
  let currentPath = "";

  // First, group lines by file
  lines.forEach((line) => {
    const pathMatch = line.match(/^\/.*\/.*$/);
    if (pathMatch) {
      const fullPath = pathMatch[0];
      const pathParts = fullPath.split("/");
      currentPath = path.join(
        pathParts[pathParts.length - 2],
        pathParts[pathParts.length - 1]
      );

      // Default exclusions (check shortened path and full path for interfaces)
      const lowerFullPath = fullPath.toLowerCase();
      const fileName = path.basename(fullPath);

      // Smart interface detection: files matching I[CapitalLetter]*.sol pattern
      const isInterfaceByNaming = fileName.length > 1 &&
                                   fileName.startsWith("I") &&
                                   fileName[1] === fileName[1].toUpperCase() &&
                                   fileName[1] !== fileName[1].toLowerCase() &&
                                   fileName.endsWith(".sol");

      // Hardcoded exclusions for common libraries and test files
      if (
        currentPath.includes("openzeppelin") ||
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
        isInterfaceByNaming
      ) {
        currentPath = "";
        return;
      }

      // Check --exclude flag for specific interface names
      if (exclude) {
        const fileName = path.basename(fullPath);
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
        if (
          lowerFullPath.includes("/fuzzing/") ||
          lowerFullPath.includes("/test/")
        ) {
          currentPath = "";
          return;
        }
      }

      // Filter for --logical flag: only include logicalCoverage/logical*.sol files
      if (logical) {
        const normalizedFullPath = fullPath.replace(/\\/g, '/');
        const hasLogicalFolder = normalizedFullPath.includes("/logicalCoverage/");
        const fileName = path.basename(fullPath);
        const isLogicalFile = fileName.startsWith("logical") && fileName.endsWith(".sol");

        if (!(hasLogicalFolder && isLogicalFile)) {
          currentPath = "";
          return;
        }
      }

      fileDataMap[currentPath] = [];
    } else if (currentPath) {
      fileDataMap[currentPath].push(line);
    }
  });

  return Object.keys(fileDataMap).map((filePath) => {
    const functionBlocks = parseFunctions(fileDataMap[filePath], allFunctions);
    const lineData: LineData[] = functionBlocks.map((fb) => ({
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

export function readFileAndProcess(filePath: string, allFunctions: boolean, sourceOnly: boolean = false, logical: boolean = false, exclude?: string): FileDataWithCoverage[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return processFileContent(fileContent, allFunctions, sourceOnly, logical, exclude);
}

const checkViewOrPureFunction = (content: string): boolean => {
  const words = content
    .toLowerCase()
    .split(/[\s(),]+/)
    .map((word) => word.trim())
    .filter((word) => word);

  // Check for view/pure modifiers
  if (words.includes("view") || words.includes("pure")) {
    return true;
  } else {
    return false;
  }
};
