import https from "https";
import * as fs from "fs";
import * as path from "path";
import { style } from "../style";
import { ScopeContract } from "../types/types";

// Compare semantic versions (returns true if v1 > v2)
const isVersionGreater = (v1: string, v2: string): boolean => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }

  return false; // versions are equal
};

export const checkLatestVersion = (currentVersion: string): Promise<void> => {
  return new Promise((resolve) => {
    https
      .get(
        "https://api.github.com/repos/simon-busch/echidna-coverage/tags",
        {
          headers: {
            "User-Agent": "echidna-coverage",
            Accept: "application/vnd.github.v3+json",
          },
        },
        (res) => {
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
                console.log(
                  style.warning(`\nNew version available: ${latestVersion} (current: ${currentVersion})`)
                );
                console.log(style.info("To upgrade, run: brew upgrade Simon-Busch/echidna-coverage/echidna-coverage\n"));
              }
            } catch (error) {
              console.log(style.dim("Unable to check for updates"));
            }
            resolve();
          });
        }
      )
      .on("error", () => {
        console.log(style.dim("Network error checking for updates"));
        resolve();
      });
  });
};

export const parseScopeFile = (scopeFilePath: string): ScopeContract[] => {
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
  } catch (error) {
    console.error(style.error(`Error reading scope file: ${error}`));
    return [];
  }
};

export const getContractNameFromPath = (fullPath: string): string => {
  // Extract the filename from the full path
  // e.g., "amm-pool-type-dynamic/src/DynamicPoolType.sol" -> "DynamicPoolType.sol"
  return path.basename(fullPath);
};
