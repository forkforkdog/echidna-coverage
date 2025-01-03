export interface LineData {
  functionName: string;
  touched: boolean;
  reverted: boolean;
  isFullyCovered: boolean;
  untouchedLines: number;
  revertedContent: string[];
  untouchedContent: string[];
}

export interface FileData {
  path: string;
  data: LineData[];
}

export interface CoverageStats {
  totalFunctions: number;
  coveredLines: number;
  revertedLines: number;
  untouchedLines: number;
  functionCoveragePercentage: number;
  lineCoveragePercentage: number;
  fullyCoveredFunctions: number;
}

export interface FileDataWithCoverage extends FileData {
  coverage: CoverageStats;
}

export interface FunctionBlock {
  name: string;
  lines: string[];
  isTouched: boolean;
  isReverted: boolean;
  coveredLines: number;
  untouchedLines: number;
  revertedLines: number;
  isTotallyCovered: boolean;
  revertedContent: string[];
  untouchedContent: string[];
  totalLines: number;
}

export interface ProgramOptions {
  verbose: boolean;
  filePath?: string;
  outputFormat: "table" | "json";
  threshold: number;
  help: boolean;
  contract?: string;
  veryVerbose: boolean;
  echidnaFolder?: string;
}
