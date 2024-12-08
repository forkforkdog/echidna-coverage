import * as fs from "fs";
import * as path from "path";

interface LineData {
  functionName: string;
  covered: boolean;
  reverted: boolean;
}

interface FileData {
  path: string;
  data: LineData[];
}

interface CoverageStats {
  totalFunctions: number;
  coveredLines: number;
  revertedLines: number;
  untouchedLines: number;
  coveragePercentage: number;
}

interface FileDataWithCoverage extends FileData {
  coverage: CoverageStats;
}

interface FunctionBlock {
  name: string;
  lines: string[];
  isCovered: boolean;
  isReverted: boolean;
  coveredLines: number;
  untouchedLines: number;
  revertedLines: number;
  isTotallyCovered: boolean;
}

function parseFunctions(lines: string[]): FunctionBlock[] {
  const functions: FunctionBlock[] = [];
  let currentFunction: FunctionBlock | null = null;
  let bracketCount = 0;

  lines.forEach((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3) return;

    const content = parts[2];
    const functionMatch = content.match(
      /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/
    );

    // Start new function block
    if (functionMatch) {
      bracketCount = 0;
      currentFunction = {
        name: functionMatch[1],
        lines: [],
        isCovered: false,
        isReverted: false,
        coveredLines: 0,
        untouchedLines: 0,
        revertedLines: 0,
        isTotallyCovered: false,
      };
    }

    // Track function content
    if (currentFunction) {
      currentFunction.lines.push(line);

      // Skip counting if line only contains closing brace
      const trimmedContent = content.trim();
      if (trimmedContent === "}") {
        // Don't count closing brace as any type of line
        null;
      } else if (parts[1] === "*") {
        currentFunction.coveredLines++;
        currentFunction.isCovered = true;
      } else if (parts[1] === "r") {
        currentFunction.revertedLines++;
        currentFunction.isReverted = true;
        // If line is not empty and not a comment
      } else if (
        parts[1] === "" &&
        trimmedContent !== "" &&
        !trimmedContent.startsWith("//") &&
        !trimmedContent.startsWith("/*") &&
        !trimmedContent.startsWith("*") &&
        !trimmedContent.startsWith("}") &&
        !trimmedContent.startsWith("return") &&
        !trimmedContent.includes("{") &&
        !trimmedContent.includes(") {") &&
        !trimmedContent.includes(");") &&
        !trimmedContent.startsWith(")") &&
        !trimmedContent.includes("external") &&
        !trimmedContent.includes("internal") &&
        !trimmedContent.includes("public") &&
        !trimmedContent.includes("view")
      ) {
        console.log(trimmedContent, "🚧");
        currentFunction.untouchedLines++;
      }

      if (content.includes("{")) bracketCount++;
      if (content.includes("}")) {
        bracketCount--;
        if (bracketCount === 0) {
          functions.push(currentFunction);
          currentFunction = null;
        }
      }
    }
  });

  functions.map((f) => {
    if (f.coveredLines > 0 && f.untouchedLines === 0 && f.revertedLines === 0) {
      f.isTotallyCovered = true;
    }
  });

  return functions;
}

function calculateCoverage(functions: FunctionBlock[]): CoverageStats {
  // console.log("functions ----> \n");
  // functions.forEach((f) => {
  //   console.log("name:", f.name);
  //   console.log("Covered lines:", f.coveredLines);
  //   console.log("Untouched lines:",f.untouchedLines);
  //   console.log("Reverted Lines:", f.revertedLines);
  //   console.log("Is covered: ",f.isCovered);
  //   console.log("is reverted", f.isReverted);
  //   console.log("isTotallyCovered", f.isTotallyCovered);
  // });

  const totalFunctions = functions.length;
  const coveredFunctions = functions.filter((f) => f.isTotallyCovered).length;
  const coveredLines = functions.reduce((acc, f) => acc + f.coveredLines, 0);
  const revertedFunctions = functions.filter((f) => f.isReverted).length;
  const totalUntouchedLines = functions.reduce(
    (acc, f) => acc + f.untouchedLines,
    0
  );

  return {
    totalFunctions: totalFunctions,
    coveredLines: coveredLines,
    revertedLines: revertedFunctions,
    untouchedLines: totalUntouchedLines,
    coveragePercentage: Number(
      ((coveredFunctions / totalFunctions) * 100).toFixed(2)
    ),
  };
}

function processFileContent(fileContent: string): FileDataWithCoverage[] {
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
      fileDataMap[currentPath] = [];
    } else if (currentPath) {
      if (
        currentPath.includes("openzeppelin") ||
        currentPath.includes("forge") ||
        currentPath.includes(".t.sol") ||
        currentPath.includes(".s.sol") ||
        currentPath.includes("solady")
      ) {
        return;
      }
      fileDataMap[currentPath].push(line);
    }
  });

  return Object.keys(fileDataMap).map((filePath) => {
    const functionBlocks = parseFunctions(fileDataMap[filePath]);
    const lineData: LineData[] = functionBlocks.map((fb) => ({
      functionName: fb.name,
      covered: fb.isCovered,
      reverted: fb.isReverted,
    }));
    return {
      path: filePath,
      data: lineData,
      coverage: calculateCoverage(functionBlocks),
    };
  });
}

function readFileAndProcess(filePath: string): FileDataWithCoverage[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return processFileContent(fileContent);
}

// Example usage with formatted output
const filePath = "./data/test.txt";
const result = readFileAndProcess(filePath);
result.forEach((file) => {
  console.log(`\nFile: ${file.path}`);
  console.table(file.coverage);
});
