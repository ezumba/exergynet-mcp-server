#!/usr/bin/env node
// Permanent release gate (added for 0.2.6, see MCP_RELEASE_PROVENANCE_0.2.6.md).
//
// A repo-root `npm audit` can pass while a real downstream install still
// fails, because package.json `overrides` are only honored by npm when your
// own package.json is the root of the install — they have no effect on a
// consumer who installs this package as a dependency. 0.2.5 shipped exactly
// that gap: 0 findings in this repo, 4 moderate findings for every ordinary
// `npm install exergynet-mcp-server` user.
//
// This script builds the actual publishable tarball, installs it in a fresh,
// unrelated directory the same way a real user would, and fails if that
// install is not clean. Run it before every publish: `npm run test:consumer-install`.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Resolve npm the same way `npm run` itself does (via npm_execpath, run through
// this same Node binary), rather than relying on shell resolution of `npm`/`npm.cmd`
// — this avoids both cross-platform PATH issues and the shell:true argument-escaping
// footgun in a script meant to be a permanent, unattended release gate.
const npmExecPath = process.env.npm_execpath;
function npmArgs(args) {
    return npmExecPath ? [npmExecPath, ...args] : args;
}
function npmBin(args) {
    return npmExecPath ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
}

// Only the no-npm_execpath fallback (i.e. this script invoked directly with
// `node`, not via `npm run`) needs a shell to resolve npm.cmd on Windows.
// All arguments passed through this path are internally generated (temp
// paths, hardcoded flags) — never external/attacker-controlled — so shell:true
// here does not carry the usual argument-injection risk that flag normally warns about.
const needsShellFallback = !npmExecPath && process.platform === "win32";

function run(cmd, args, opts = {}) {
    const isNpm = cmd === "npm";
    console.log(`\n$ ${cmd} ${args.join(" ")}`);
    return execFileSync(isNpm ? npmBin() : cmd, isNpm ? npmArgs(args) : args, { stdio: "inherit", shell: isNpm && needsShellFallback, ...opts });
}

function runCapture(cmd, args, opts = {}) {
    const isNpm = cmd === "npm";
    return execFileSync(isNpm ? npmBin() : cmd, isNpm ? npmArgs(args) : args, { encoding: "utf8", shell: isNpm && needsShellFallback, ...opts });
}

const repoRoot = process.cwd();
const packDir = mkdtempSync(join(tmpdir(), "exergynet-pack-"));
const installDir = mkdtempSync(join(tmpdir(), "exergynet-consumer-"));

try {
    console.log("== Step 1: pack the actual publishable tarball ==");
    const packOutput = runCapture("npm", ["pack", "--json", "--pack-destination", packDir], { cwd: repoRoot });
    const [{ filename }] = JSON.parse(packOutput);
    const tarballPath = join(packDir, filename);
    console.log(`Packed: ${tarballPath}`);

    console.log("\n== Step 2: install the tarball in a fresh, unrelated directory ==");
    run("npm", ["init", "-y"], { cwd: installDir });
    run("npm", ["install", tarballPath], { cwd: installDir });

    console.log("\n== Step 3: verify the consumer's own dependency tree ==");
    run("npm", ["ls", "exergynet-mcp-server"], { cwd: installDir });

    console.log("\n== Step 4: npm audit from the consumer's perspective (the actual release gate) ==");
    let auditJson;
    try {
        auditJson = runCapture("npm", ["audit", "--json"], { cwd: installDir });
    } catch (e) {
        // npm audit exits non-zero when vulnerabilities are found; we still need its JSON output.
        auditJson = e.stdout ? e.stdout.toString() : "{}";
    }
    const audit = JSON.parse(auditJson);
    const total = audit.metadata?.vulnerabilities?.total ?? -1;

    if (total !== 0) {
        console.error(`\nFAIL: consumer install reports ${total} vulnerabilities (expected 0).`);
        console.error(JSON.stringify(audit.metadata?.vulnerabilities ?? audit, null, 2));
        process.exit(1);
    }

    console.log(`\nPASS: CLEAN_CONSUMER_INSTALL_NPM_AUDIT = 0 (verified from outside the repository, tarball: ${filename})`);
} finally {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(installDir, { recursive: true, force: true });
}
