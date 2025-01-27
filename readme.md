# Echidna Coverage Reporter

A TypeScript tool to parse and analyze Echidna code coverage reports for Solidity smart contracts.

## Features

- Parse Echidna coverage output files
- Generate coverage reports by contract and function
- Track covered, uncovered, and reverted functions
- Multiple output formats (table/JSON)
- Coverage threshold checks
- Detailed verbose reporting option

## Installation

```bash
brew install Simon-busch/echidna-coverage/echidna-coverage
```

## Usage

Basic usage:

```bash
echidna-coverage -f ./coverage.txt
```

With all options:

```bash
echidna-coverage -vv --format table -t 90 --contract /TestContract.sol
```

## Options

- -v, --verbose: Show detailed output including uncovered functions
- -vv, --very-verbose: verbose mode + add logs of untouched lines and reverted lines
- -f, --file `<path>`: Path to a specfic coverage file.txt
- -ef, --echidna-folder `<path>`: path to the root of your directory containing the `echidna` folder. Defaults to ".". Accept `echidna` or `corpusDir` as default
- --format `<type>`: Output format - 'table' or 'json' (default: table)
- -t, --threshold `<n>`: Coverage threshold percentage (default: 70)
- -h, --help: Show help message
- -c, --contract: filter by contract name matching
- -cm, --condensed-mode: condensed mode only returning the % covered per file

## Output Example

### Using condensed mode

```bash
══════════════════════════════════════════════════
📄 File: vaults/Test.sol
══════════════════════════════════════════════════
97.14 %
```

### Using normal mode

```bash
══════════════════════════════════════════════════
📄 File: vaults/TestContract.sol
══════════════════════════════════════════════════
┌────────────────────────────┬────────┐
│          (index)           │ Values │
├────────────────────────────┼────────┤
│       totalFunctions       │   37   │
│   fullyCoveredFunctions    │   32   │
│        coveredLines        │  209   │
│       revertedLines        │   0    │
│       untouchedLines       │   6    │
│ functionCoveragePercentage │ 86.49  │
│   lineCoveragePercentage   │ 97.21  │
└────────────────────────────┴────────┘
══════════════════════════════════════════════════
```

### Using verbose mode (-v)

```bash
══════════════════════════════════════════════════
📄 File: vaults/TestContract.sol
══════════════════════════════════════════════════
┌────────────────────────────┬────────┐
│          (index)           │ Values │
├────────────────────────────┼────────┤
│       totalFunctions       │   37   │
│   fullyCoveredFunctions    │   32   │
│        coveredLines        │  209   │
│       revertedLines        │   0    │
│       untouchedLines       │   6    │
│ functionCoveragePercentage │ 86.49  │
│   lineCoveragePercentage   │ 97.21  │
└────────────────────────────┴────────┘

⚠️ Not fully covered functions:
┌─────────┬────────────────────────────────────────────┬─────────┬──────────┬────────────────┐
│ (index) │                functionName                │ touched │ reverted │ untouchedLines │
├─────────┼────────────────────────────────────────────┼─────────┼──────────┼────────────────┤
│    0    │                 '_getData_'                │  true   │  false   │       1        │
│    1    │                 '_init_'                   │  true   │  false   │       1        │
│    2    │             '_harvestRewards'              │  true   │  false   │       1        │
│    3    │               'totalAssets'                │  true   │  false   │       2        │
│    4    │            '_autoCompoundHook'             │  false  │  false   │       1        │
└─────────┴────────────────────────────────────────────┴─────────┴──────────┴────────────────┘
══════════════════════════════════════════════════
```

### Using very-verbose mode (-vv)

```bash
══════════════════════════════════════════════════
📄 File: vaults/TestContract.sol
══════════════════════════════════════════════════
┌────────────────────────────┬────────┐
│          (index)           │ Values │
├────────────────────────────┼────────┤
│       totalFunctions       │   37   │
│   fullyCoveredFunctions    │   32   │
│        coveredLines        │  209   │
│       revertedLines        │   0    │
│       untouchedLines       │   6    │
│ functionCoveragePercentage │ 86.49  │
│   lineCoveragePercentage   │ 97.21  │
└────────────────────────────┴────────┘

⚠️ Not fully covered functions:
┌─────────┬────────────────────────────────────────────┬─────────┬──────────┬────────────────┐
│ (index) │                functionName                │ touched │ reverted │ untouchedLines │
├─────────┼────────────────────────────────────────────┼─────────┼──────────┼────────────────┤
│    0    │                 '_getData_'                │  true   │  false   │       1        │
│    1    │                 '_init_'                   │  true   │  false   │       1        │
│    2    │             '_harvestRewards'              │  true   │  false   │       1        │
│    3    │               'totalAssets'                │  true   │  false   │       2        │
│    4    │            '_autoCompoundHook'             │  false  │  false   │       1        │
└─────────┴────────────────────────────────────────────┴─────────┴──────────┴────────────────┘

Function: _getData_
❌ Untouched lines:
assembly {

Function: _init_
❌ Untouched lines:
revert("CollVault: 0 address");

Function: _harvestRewards
❌ Untouched lines:
iVault.stake(netRewards);

Function: totalAssets
❌ Untouched lines:
address[] memory currentRewardTokens,
uint currentRewardTokensLength

Function: _autoCompoundHook
❌ Untouched lines:
return (_rewards, _token);
══════════════════════════════════════════════════
```

## Note

- Test and scripts files are filtered out
- View function are trimmed out, as they are not relevant

## Contributing

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

## License

MIT
