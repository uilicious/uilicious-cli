# Changelog

All notable changes to `uilicious-cli` (`cli-code`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Added `--retryWhen <mode>` option supporting `always` (default), `never`, and `onSystemError` to configure CLI retry behavior upon start errors, concurrency exhaustion, and runtime system errors.
- Added `--no-retry` shorthand flag as an alias for `--retryWhen never`.

### Changed

### Fixed
- Fixed error extraction on test start failure so error messages and API responses are formatted clearly without stringifying as `[object Object]`.
- Fixed out-of-scope `startTimeout` reference error during core test start timeout checking.

### Deprecated
- Deprecated `--disableSystemErrorRetry` flag in favor of `--retryWhen onSystemError` (flag is now hidden from help documentation).

### Removed

---

## [5.1.15] - 2025-02-05

### Added
- Added proxy server support (`http_proxy` / `https_proxy`) and proxy verification utilities.

### Changed
- Improved CLI logging and output handling; dropped legacy `yargs` dependency in favor of `sywac`.
