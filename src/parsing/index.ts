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
      };
    }

    // Check lines between function declaration and opening brace for view/external
    if (currentFunction && !functionBodyStarted) {
      if (checkViewOrPureFunction(content)) {
        currentFunction.isViewPure = checkViewOrPureFunction(content);
      }
    }

    if (currentFunction) {
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
        const trimmedContent = content.trim();
        if (trimmedContent === "assembly {") {
          const nextParts = lines[index + 1]
            .split("|")
            .map((part) => part.trim());
          if (nextParts[1] === "*") {
            currentFunction.coveredLines++;
            currentFunction.isTouched = true;
          } else if (nextParts[1] === "r") {
            currentFunction.revertedLines++;
            currentFunction.revertedContent.push(content);
            currentFunction.isReverted = true;
            currentFunction.isTouched = true;
          } else if (nextParts[1] === "" && isUntouchedLine(content)) {
            currentFunction.untouchedLines++;
            currentFunction.untouchedContent.push(content);
          }
        } else if (trimmedContent === "}") {
          // Don't count closing brace
          null;
        } else if (parts[1] === "*") {
          currentFunction.coveredLines++;
          currentFunction.isTouched = true;
        } else if (parts[1] === "r") {
          currentFunction.revertedLines++;
          currentFunction.revertedContent.push(content);
          currentFunction.isReverted = true;
          currentFunction.isTouched = true;
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
          } else {
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
  } else {
    return functions.filter((f) => !f.isViewPure);
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

function calculateCoverage(functions: FunctionBlock[]): CoverageStats {
  const totalFunctions = functions.length;
  const coveredFunctions = functions.filter((f) => f.isTotallyCovered).length;
  const coveredLines = functions.reduce((acc, f) => acc + f.coveredLines, 0);
  const revertedFunctions = functions.filter((f) => f.isReverted).length;
  const totalUntouchedLines = functions.reduce(
    (acc, f) => acc + f.untouchedLines,
    0
  );
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

function processFileContent(fileContent: string, allFunctions: boolean): FileDataWithCoverage[] {
  const lines = fileContent.split("\n");
  const fileDataMap: { [key: string]: string[] } = {};
  let currentPath = "";

  // First, group lines by file
  lines.forEach((line) => {
    const pathMatch = line.match(/^\/.*\/.*$/);
    if (pathMatch) {
      currentPath = pathMatch[0];
      const pathParts = currentPath.split("/");
      currentPath = path.join(
        pathParts[pathParts.length - 2],
        pathParts[pathParts.length - 1]
      );
      if (
        currentPath.includes("openzeppelin") ||
        currentPath.includes("forge") ||
        currentPath.endsWith(".t.sol") ||
        currentPath.endsWith(".s.sol") ||
        currentPath.includes("solady")
      ) {
        currentPath = "";
        return;
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
      coverage: calculateCoverage(functionBlocks),
    };
  });
}

export function readFileAndProcess(filePath: string, allFunctions: boolean): FileDataWithCoverage[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return processFileContent(fileContent, allFunctions);
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
