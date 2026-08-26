# UI-licious CLI (`cli-code`) — Architecture & Usage Overview

`uilicious-cli` is the official command-line interface for the [UI-licious](https://uilicious.com) testing platform. It enables developers, QA engineers, and CI/CD pipelines to run end-to-end user journey tests, synchronize local test scripts with UI-licious cloud/on-premise workspaces, manage scheduled test jobs, and inspect test results.

---

## 1. Technology Stack & Tooling

| Category | Technology | Purpose & Rationale |
|---|---|---|
| **Runtime** | **Node.js (>= 10.0.0)** | Cross-platform CommonJS runtime compatible with standard CI/CD runners and developer workstations. |
| **CLI Engine** | **`sywac` (^1.3.0)** | Declarative argument parser supporting subcommands, custom type parsers, layered validation checks, styled help menus, and example blocks. |
| **HTTP Transport** | **`axios` (^0.21.4)** + **`form-data`** | Manages REST API communication, automated cookie jar persistence, multipart/form-data uploads, and binary stream downloads. |
| **Concurrency Control** | **`promise-queue` (^2.2.5)** | Throttles concurrent API requests (e.g. batch file upload/download queues limited to 4 concurrent workers). |
| **Archive Compression** | **`archiver` (^5.3.0)** / **`archiver-promise`** | Bundles local test directories into streaming ZIP archives on-the-fly when running tests locally via `--testCodeDir`. |
| **Output Formatting** | **`chalk` (^2.4.2)** | Colored ANSI terminal output, status indicators, and error formatting. |
| **Data Parsing** | **`hjson` (^3.2.2)** | Lenient JSON parsing for external test dataset files (`--dataFile`). |
| **Binary Packaging** | **`pkg` (^5.3.1)** | Compiles standalone, self-contained single-executable binaries for macOS (x64, arm64), Linux (x64, arm64, armv7), Alpine (x64), and Windows (x64). |

---

## 2. Repository & Project Structure

```text
cli-code/
├── docs/                                # Project documentation
│   └── overview.md                      # Tech stack, structure, and usage guide (this file)
├── readme-img/                          # Screenshots and CLI banner assets
├── src/                                 # Core source code
│   ├── api/                             # API communication layer
│   │   ├── ApiServerConnector.js        # Core Axios instance, cookies, proxy handling, and auth
│   │   ├── SpaceAndProjectApi.js        # High-level API calls (spaces, projects, files, runs, jobs)
│   │   └── retryForResult.js            # Exponential backoff and polling helper
│   ├── cli-command/                     # Command modules grouped by domain
│   │   ├── job/                         # Scheduled job operations
│   │   │   ├── history.js               # 'job history <project> <job>'
│   │   │   ├── list.js                  # 'job list <project>'
│   │   │   └── start.js                 # 'job start <project> <job>' / 'job run'
│   │   ├── project/                     # Project and test operations
│   │   │   ├── concurrency.js           # 'project concurrency <project>'
│   │   │   ├── download.js              # 'project download <project> <dir>'
│   │   │   ├── filelist.js              # 'project filelist <project>'
│   │   │   ├── list.js                  # 'project list'
│   │   │   ├── run.js                   # 'project run <project> <test>'
│   │   │   └── upload.js                # 'project upload <project> <dir>'
│   │   └── space/                       # Workspace operations
│   │       └── list.js                  # 'space list'
│   ├── util/                            # Shared utilities
│   │   ├── ErrorUtil.js                 # Error object parsing and human-readable message extraction
│   │   ├── FileUtil.js                  # Recursive file scanner, path normalization, ZIP archiver
│   │   └── FormatShift.js               # Terminal table and data restructuring helpers
│   ├── ArgumentValidator.js             # Authentication, apiHost, and deprecated argument rules
│   ├── MainSywac.js                     # Sywac instance configuration and theme styling
│   ├── OutputHandler.js                 # Centralized output stream manager (Std, Table, JSON, Trace)
│   ├── uilicious-cli.js                 # Main CLI binary entry point and route setup
│   └── version.js                       # Single source of version truth
├── docs/                                # Developer and operational documentation
│   ├── deployment.md                    # Release and binary packaging guide (NPM & GitHub Releases)
│   └── overview.md                      # Architecture and codebase onboarding guide
├── AGENTS.md                            # Development workflow and AI agent instructions
├── CHANGELOG.md                         # Semantic version change tracking (functional code only)
├── package.json                         # NPM package metadata and dependencies
├── pkg-build.sh                         # Multi-target executable compilation script
└── readme.md                            # Public usage documentation and quick start
```

---

## 3. Core Architecture & Execution Flow

```mermaid
graph TD
    CLI["CLI Entry Point (src/uilicious-cli.js)"] --> Sywac["Sywac Parser & MainSywac.js"]
    Sywac --> ArgVal["ArgumentValidator.js (Auth, --apiHost, --loginAs)"]
    ArgVal --> Auth["ApiServerConnector.js (CSRF Token, Access Key / Session Cookie)"]
    Sywac --> Out["OutputHandler.js (Standard, Table, JSON, Trace)"]
    Sywac --> CmdRouter{"Command Dispatcher"}
    
    CmdRouter -->|"run / project run"| TestRunner["TestRunnerSession (src/cli-command/project/run.js)"]
    CmdRouter -->|"upload / project upload"| Uploader["File Uploader (src/cli-command/project/upload.js)"]
    CmdRouter -->|"download / project download"| Downloader["File Downloader (src/cli-command/project/download.js)"]
    CmdRouter -->|"job *"| JobCmds["Job Commands (src/cli-command/job/)"]
    CmdRouter -->|"space list"| SpaceCmds["Space Commands (src/cli-command/space/)"]

    TestRunner --> API["SpaceAndProjectApi.js"]
    Uploader --> API
    Downloader --> API
    JobCmds --> API
    SpaceCmds --> API
    API --> Connector["ApiServerConnector.js (Axios + Proxies + Throttling Queue)"]
    Connector --> Backend["UI-licious API (/v3.0)"]
```

---

## 4. Setup & Installation

### Prerequisites
- **Node.js**: `v10.0.0` or higher (Node 16+ or 18+ recommended)
- **NPM**: `v5.6.0` or higher

### Local Development Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Run the CLI directly via Node:
   ```bash
   node ./src/uilicious-cli.js --help
   # or via npm script
   npm run cli -- --help
   ```

### Global Installation via NPM
```bash
npm install -g uilicious-cli
```

### Standalone Binary Compilation
To compile single-executable binary packages for distribution without requiring Node.js installed on the target machine:
```bash
./pkg-build.sh
```
Compiled standalone binaries are emitted into the `bin/` directory for macOS, Linux, Alpine, and Windows. See the complete [Deployment & Packaging Guide](./deployment.md) for full release and distribution procedures.

---

## 5. Authentication & Environment Configuration

### Authentication Methods
1. **Access Key (Recommended)**:
   Pass directly on the command line:
   ```bash
   uilicious-cli run "MyProject" "login.test" --key "<YOUR_ACCESS_KEY>"
   ```
   Or set the environment variable:
   ```bash
   export UILICIOUS_ACCESSKEY="<YOUR_ACCESS_KEY>"
   ```
2. **Username and Password**:
   ```bash
   uilicious-cli run "MyProject" "login.test" --user "<EMAIL>" --pass "<PASSWORD>"
   ```

### Dedicated & On-Premise Instances
When targeting a self-hosted or dedicated instance, specify `--apiHost`:
```bash
uilicious-cli run "MyProject" "login.test" --key "<KEY>" --apiHost "https://uilicious.internal.corp/api/v3.0"
# or via environment variable:
export UILICIOUS_API_HOST="https://uilicious.internal.corp/api/v3.0"
```

### Proxy Configuration
The CLI natively respects standard proxy environment variables:
- `https_proxy` / `http_proxy`: Proxy URL (e.g., `http://proxy.internal:8080` or `http://user:pass@proxy.internal:8080`).
- `no_proxy`: Comma-separated domain suffixes to bypass (e.g., `localhost,127.0.0.1,.corp`).

---

## 6. CLI Usage & Key Commands

### 1. Running Tests (`run` / `project run`)
Executes an end-to-end test script in the specified project.

```bash
uilicious-cli run <project-name-or-id> <script-path> [options]
```

**Common Options:**
- `--browser <name>`: Target browser (`chrome` [default], `firefox`, `edge`, `safari`, `ie11`).
- `--width <px>`: Viewport width in pixels (default: `1280`).
- `--height <px>`: Viewport height in pixels (default: `960`).
- `--region <name>`: Target execution region (e.g. `default`, `us-east-1`).
- `--dataset <name>`: Named dataset configured in the project.
- `--dataObject <json-string>`: JSON string representing test variables.
- `--dataFile <path-to-json-or-hjson>`: Path to a local JSON/Hjson data file.
- `--testCodeDir <local-dir>`: Runs tests using a local test code directory instead of remote project files (bundled as a temporary ZIP archive).
- `--startTimeout <minutes>`: Test startup timeout in minutes (default: `15`).
- `--retryWhen <mode>`: Retry policy (`always` [default], `never`, or `onSystemError`).
- `--no-retry`: Shorthand for `--retryWhen never` (fails fast on all errors).

**Examples:**
```bash
# Basic test run
uilicious-cli run "Demo" "login/smoke-test"

# Run with custom browser, resolution, and dataset
uilicious-cli run "Demo" "checkout" --browser firefox --width 1920 --height 1080 --dataset "PROD"

# Run tests directly from a local directory (useful in CI pull requests)
uilicious-cli run "Demo" "tests/checkout" --testCodeDir ./tests
```

---

### 2. Uploading Project Files (`upload` / `project upload`)
Uploads local test files to a UI-licious project.

```bash
uilicious-cli upload <project-name-or-id> <local-directory> [options]
```
- `--remoteFilePath <subpath>`: Target subpath in the project to upload into.
- `--skipExisting`: Skips files that already exist on the server instead of overwriting.
- `--sequential`: Disables concurrency (processes 1 file at a time for debugging).

---

### 3. Downloading Project Files (`download` / `project download`)
Downloads test files from a UI-licious project to a local directory.

```bash
uilicious-cli download <project-name-or-id> <local-directory> [options]
```
- `--remoteFilePath <subpath>`: Downloads only a specific subpath or file.
- `--skipExisting`: Skips local files that already exist.
- `--sequential`: Disables concurrency.

---

### 4. Project Inspection Commands
```bash
# List all accessible projects across spaces
uilicious-cli project list

# List all test files within a project
uilicious-cli project filelist <project-name-or-id>

# Check current concurrency usage and limits for a project
uilicious-cli project concurrency <project-name-or-id>
```

---

### 5. Scheduled Job Commands
```bash
# List scheduled jobs in a project
uilicious-cli job list <project-name-or-id>

# Trigger a scheduled job immediately
uilicious-cli job start <project-name-or-id> <job-name-or-id>

# View execution run history for a job
uilicious-cli job history <project-name-or-id> <job-name-or-id>
```

---

### 6. Workspace Commands
```bash
# List all spaces/workspaces accessible by the authenticated user
uilicious-cli space list
```

---

## 7. Output Formats & Process Exit Codes

### Output Modes
- **Standard (Default)**: Human-readable output with ANSI status colors and step progression.
- `--table` / `--tableOutput`: Formats listings and step logs into fixed-width ASCII tables.
- `--json` / `--jsonOutput`: Emits a single JSON structure containing test results, step timings, and URLs.
- `-t` / `--trace`: Enables verbose request and response logging for debugging.
- `-s` / `--silent`: Suppresses standard output for scripting environments.

### Process Exit Codes
| Exit Code | Meaning |
|---|---|
| `0` | Success (all tests passed, command completed without errors). |
| `1` | CLI argument validation error. |
| `2` | Authentication error or process interrupt (`SIGINT`). |
| `3` | Connection error / missing resource. |
| `14` | Test execution failure (one or more test steps failed). |
| `15` | Invalid test script path. |
| `16` | No concurrency available or plan error. |
| `18` | Start timeout exceeded or maximum system retries exceeded. |
| `42` / `50` | Generic fatal runtime error. |
