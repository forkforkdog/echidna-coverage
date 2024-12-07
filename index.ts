import * as fs from "fs";
import * as path from "path";

interface LineData {
  content: string;
  covered: boolean;
  reverted: boolean;
}

interface FileData {
  path: string;
  data: LineData[];
}

interface CoverageStats {
  totalLines: number;
  coveredLines: number;
  revertedLines: number;
  coveragePercentage: number;
}

interface FileDataWithCoverage extends FileData {
  coverage: CoverageStats;
}

function parseLine(line: string): LineData | null {
  const parts = line.split("|").map((part) => part.trim());
  if (parts.length < 3) return null;

  const content = parts[2];
  if (
    !content ||
    content.startsWith("import") ||
    content.startsWith("pragma") ||
    content.startsWith("//") || 
    content.startsWith("contract") ||
    content.startsWith("/**") 
  ) {
    return null;
  }

  return {
    content,
    covered: parts[1] === "*",
    reverted: parts[1] === "r",
  };
}

function calculateCoverage(data: LineData[]): CoverageStats {
  const totalLines = data.length;
  const coveredLines = data.filter((line) => line.covered).length;
  const revertedLines = data.filter((line) => line.reverted).length;
  const coveragePercentage = (coveredLines / totalLines) * 100;
  if (Number(coveragePercentage.toFixed(2)) > 0) {
    return {
      totalLines,
      coveredLines,
      revertedLines,
      coveragePercentage: Number(coveragePercentage.toFixed(2)),
    };
  } else {
    return {
      totalLines,
      coveredLines,
      revertedLines,
      coveragePercentage: 0,
    };
  }
}

function processFileContent(fileContent: string): FileDataWithCoverage[] {
  const lines = fileContent.split("\n");
  const fileDataMap: { [key: string]: LineData[] } = {};

  let currentPath = "";

  lines.forEach((line) => {
    const pathMatch = line.match(/^\/.*\/.*$/);
    if (pathMatch) {
      currentPath = pathMatch[0];
      const pathParts = currentPath.split("/");
      currentPath = path.join(
        pathParts[pathParts.length - 3],
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
      const lineData = parseLine(line);
      if (lineData) {
        fileDataMap[currentPath].push(lineData);
      }
    }
  });

  return Object.keys(fileDataMap).map((filePath) => ({
    path: filePath,
    data: fileDataMap[filePath],
    coverage: calculateCoverage(fileDataMap[filePath]),
  }));
}

function readFileAndProcess(filePath: string): FileDataWithCoverage[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return processFileContent(fileContent);
}

// Example usage with formatted output
const filePath = "./data/covered.1733545843.txt";
const result = readFileAndProcess(filePath);
result.forEach((file) => {
  console.log(`\nFile: ${file.path}`);
  console.log(`Coverage: ${file.coverage.coveragePercentage}%`);
  console.log(
    `Lines: ${file.coverage.coveredLines}/${file.coverage.totalLines} covered`
  );
  console.log(`Reverted: ${file.coverage.revertedLines} lines`);
});
