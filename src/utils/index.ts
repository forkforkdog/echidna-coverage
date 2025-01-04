import https from "https";
import { style } from "../style";

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

              if (latestVersion && latestVersion !== currentVersion) {
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
