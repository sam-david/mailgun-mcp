#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MailgunInspectClient } from "./client.js";

const apiKey = process.env.MAILGUN_API_KEY ?? "";
const region = process.env.MAILGUN_REGION ?? "us";

if (!apiKey) {
  console.error("Missing MAILGUN_API_KEY environment variable.");
  process.exit(1);
}

const mg = new MailgunInspectClient(apiKey, region);

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

const server = new McpServer({
  name: "mailgun-inspect",
  version: "1.0.0",
});

// ===========================================================================
// EMAIL PREVIEW — Clients
// ===========================================================================

server.tool(
  "get_preview_clients",
  "Get the list of available email clients for preview testing",
  async () => {
    try {
      return ok(await mg.get("/v1/preview/tests/clients"));
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// EMAIL PREVIEW — Tests (V2)
// ===========================================================================

server.tool(
  "create_preview_test",
  "Create a new email preview test. Provide either html or url as the email source. Optionally enable content checking (link validation, image validation, accessibility, code analysis).",
  {
    subject: z.string().describe("Email subject line"),
    html: z
      .string()
      .optional()
      .describe("HTML content of the email (required if no url)"),
    url: z
      .string()
      .optional()
      .describe("URL to fetch email HTML from (required if no html)"),
    transfer_encoding: z.string().optional().describe("Transfer encoding"),
    charset: z.string().optional().describe("Character set (default: utf-8)"),
    clients: z
      .array(z.string())
      .optional()
      .describe("Client IDs to test against"),
    image_blocking: z
      .boolean()
      .optional()
      .describe("Also capture screenshots with images blocked"),
    reference_id: z
      .string()
      .optional()
      .describe("Enterprise: internal reference ID"),
    customer_id: z
      .string()
      .optional()
      .describe("Enterprise: customer ID"),
    folder_id: z.string().optional().describe("Folder ID to organize test"),
    project_name: z.string().optional().describe("Project name for the test"),
    link_validation: z
      .boolean()
      .optional()
      .describe("Enable link validation as part of content checking"),
    image_validation: z
      .boolean()
      .optional()
      .describe("Enable image validation as part of content checking"),
    accessibility: z
      .boolean()
      .optional()
      .describe("Enable accessibility analysis as part of content checking"),
    code_analysis: z
      .boolean()
      .optional()
      .describe("Enable code analysis as part of content checking"),
  },
  async (args) => {
    try {
      const body: Record<string, unknown> = { subject: args.subject };
      if (args.html !== undefined) body.html = args.html;
      if (args.url !== undefined) body.url = args.url;
      if (args.transfer_encoding !== undefined)
        body.transfer_encoding = args.transfer_encoding;
      if (args.charset !== undefined) body.charset = args.charset;
      if (args.clients !== undefined) body.clients = args.clients;
      if (args.image_blocking !== undefined)
        body.image_blocking = args.image_blocking;
      if (args.reference_id !== undefined)
        body.reference_id = args.reference_id;
      if (args.customer_id !== undefined) body.customer_id = args.customer_id;
      if (args.folder_id !== undefined) body.folder_id = args.folder_id;
      if (args.project_name !== undefined)
        body.project_name = args.project_name;

      const cc: Record<string, boolean> = {};
      if (args.link_validation !== undefined)
        cc.link_validation = args.link_validation;
      if (args.image_validation !== undefined)
        cc.image_validation = args.image_validation;
      if (args.accessibility !== undefined)
        cc.accessibility = args.accessibility;
      if (args.code_analysis !== undefined)
        cc.code_analysis = args.code_analysis;
      if (Object.keys(cc).length > 0) body.content_checking = cc;

      return ok(await mg.post("/v2/preview/tests", body));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "create_preview_test_with_spam",
  "Create an email preview test that also runs spam filter checks",
  {
    subject: z.string().describe("Email subject line"),
    html: z
      .string()
      .optional()
      .describe("HTML content (required if no url)"),
    url: z
      .string()
      .optional()
      .describe("URL to fetch HTML from (required if no html)"),
    clients: z.array(z.string()).optional().describe("Client IDs to test"),
    image_blocking: z.boolean().optional().describe("Capture with images blocked"),
    spam_test_method: z
      .enum(["eoa", "smtp", "seed"])
      .optional()
      .describe("How to send the spam test (default: eoa)"),
    spam_from_address: z
      .string()
      .optional()
      .describe("From address for the spam test"),
    spam_seed_key: z
      .string()
      .optional()
      .describe("Seed list key (for seed method)"),
    smtp_host: z.string().optional().describe("SMTP host (for smtp method)"),
    smtp_port: z.number().optional().describe("SMTP port (default: 25)"),
    smtp_secure: z.enum(["ssl", "tls", ""]).optional().describe("SMTP security"),
    smtp_username: z.string().optional().describe("SMTP username"),
    smtp_password: z.string().optional().describe("SMTP password"),
    link_validation: z.boolean().optional().describe("Enable link validation"),
    image_validation: z.boolean().optional().describe("Enable image validation"),
    accessibility: z.boolean().optional().describe("Enable accessibility analysis"),
    code_analysis: z.boolean().optional().describe("Enable code analysis"),
  },
  async (args) => {
    try {
      const body: Record<string, unknown> = { subject: args.subject };
      if (args.html !== undefined) body.html = args.html;
      if (args.url !== undefined) body.url = args.url;
      if (args.clients !== undefined) body.clients = args.clients;
      if (args.image_blocking !== undefined)
        body.image_blocking = args.image_blocking;

      const spam: Record<string, unknown> = {};
      if (args.spam_test_method !== undefined)
        spam.test_method = args.spam_test_method;
      if (args.spam_from_address !== undefined)
        spam.from_address = args.spam_from_address;
      if (args.spam_seed_key !== undefined) spam.key = args.spam_seed_key;
      if (args.smtp_host !== undefined) {
        const smtp_info: Record<string, unknown> = { host: args.smtp_host };
        if (args.smtp_port !== undefined) smtp_info.port = args.smtp_port;
        if (args.smtp_secure !== undefined) smtp_info.secure = args.smtp_secure;
        if (args.smtp_username !== undefined)
          smtp_info.username = args.smtp_username;
        if (args.smtp_password !== undefined)
          smtp_info.password = args.smtp_password;
        spam.smtp_info = smtp_info;
      }
      body.spam = spam;

      const cc: Record<string, boolean> = {};
      if (args.link_validation !== undefined)
        cc.link_validation = args.link_validation;
      if (args.image_validation !== undefined)
        cc.image_validation = args.image_validation;
      if (args.accessibility !== undefined)
        cc.accessibility = args.accessibility;
      if (args.code_analysis !== undefined)
        cc.code_analysis = args.code_analysis;
      if (Object.keys(cc).length > 0) body.content_checking = cc;

      return ok(await mg.post("/v2/preview/tests", body));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "list_preview_tests",
  "List email preview tests with optional filtering by date, subject, customer, or pagination",
  {
    from: z
      .string()
      .optional()
      .describe("Start date (YYYY-MM-DD HH:MM:SS, unix timestamp, or 'yesterday')"),
    to: z
      .string()
      .optional()
      .describe("End date (YYYY-MM-DD HH:MM:SS, unix timestamp, or 'yesterday')"),
    subject: z
      .string()
      .optional()
      .describe("Exact subject match (case-insensitive)"),
    customer_id: z.string().optional().describe("Filter by customer ID"),
    results: z
      .number()
      .optional()
      .describe("Results per page (1-200, default: 50)"),
    page: z.number().optional().describe("Page number (default: 1)"),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.from) params.set("from", args.from);
      if (args.to) params.set("to", args.to);
      if (args.subject) params.set("subject", args.subject);
      if (args.customer_id) params.set("customer_id", args.customer_id);
      if (args.results) params.set("results", String(args.results));
      if (args.page) params.set("page", String(args.page));
      const qs = params.toString();
      return ok(await mg.get(`/v2/preview/tests${qs ? `?${qs}` : ""}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_preview_test",
  "Get info for a specific preview test including processing status of each client and content checking results",
  { test_id: z.string().describe("The test ID") },
  async ({ test_id }) => {
    try {
      return ok(await mg.get(`/v2/preview/tests/${test_id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "delete_preview_test",
  "Permanently delete a preview test and its content checking data",
  { test_id: z.string().describe("The test ID to delete") },
  async ({ test_id }) => {
    try {
      return ok(await mg.delete(`/v2/preview/tests/${test_id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_preview_test_results",
  "Get screenshot results for a preview test for a specific client. Returns screenshot URLs, send/completion times, and bounce info.",
  {
    test_id: z.string().describe("The test ID"),
    client_id: z.string().describe("The client ID to get results for"),
  },
  async ({ test_id, client_id }) => {
    try {
      return ok(
        await mg.get(`/v2/preview/tests/${test_id}/results/${client_id}`)
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_preview_test_all_results",
  "Get screenshot results for ALL clients in a preview test (v1 endpoint). Returns all client results at once.",
  { test_id: z.string().describe("The test ID") },
  async ({ test_id }) => {
    try {
      return ok(await mg.get(`/v1/preview/tests/${test_id}/results`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "reprocess_preview_screenshots",
  "Request a retake of screenshots for specific clients on an existing test",
  {
    test_id: z.string().describe("The test ID"),
    clients: z.array(z.string()).describe("Client IDs to reprocess"),
  },
  async ({ test_id, clients }) => {
    try {
      return ok(
        await mg.put(`/v1/preview/tests/${test_id}/results/reprocess`, {
          clients,
        })
      );
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// EMAIL PREVIEW — Content
// ===========================================================================

server.tool(
  "get_preview_test_content",
  "Get the original HTML content submitted for a preview test",
  { test_id: z.string().describe("The test ID") },
  async ({ test_id }) => {
    try {
      return ok(await mg.get(`/v1/preview/tests/${test_id}/content`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_preview_test_content_inlined",
  "Get the HTML content of a preview test with all CSS inlined",
  { test_id: z.string().describe("The test ID") },
  async ({ test_id }) => {
    try {
      return ok(
        await mg.get(`/v1/preview/tests/${test_id}/content/inlinecss`)
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_preview_test_content_text",
  "Get a plain-text version of the preview test content",
  { test_id: z.string().describe("The test ID") },
  async ({ test_id }) => {
    try {
      return ok(
        await mg.get(`/v1/preview/tests/${test_id}/content/textonly`)
      );
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// EMAIL PREVIEW — Exports
// ===========================================================================

server.tool(
  "create_preview_export",
  "Create an export job that collects screenshots into a downloadable zip",
  {
    test_id: z.string().describe("The test ID"),
    clients: z
      .array(z.string())
      .describe("Client IDs to include in the export"),
  },
  async ({ test_id, clients }) => {
    try {
      return ok(
        await mg.post(`/v2/preview/tests/${test_id}/exports`, { clients })
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_preview_export",
  "Get the status and details of a screenshot export job",
  {
    test_id: z.string().describe("The test ID"),
    job_id: z
      .string()
      .optional()
      .describe("Export job ID (omit to get the latest export)"),
  },
  async ({ test_id, job_id }) => {
    try {
      const path = job_id
        ? `/v2/preview/tests/${test_id}/exports/${job_id}`
        : `/v2/preview/tests/${test_id}/exports`;
      return ok(await mg.get(path));
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// EMAIL PREVIEW — Address
// ===========================================================================

server.tool(
  "generate_preview_address",
  "Generate or retrieve your account's email preview address (send emails here for auto-testing)",
  async () => {
    try {
      return ok(await mg.post("/v2/preview/address"));
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// EMAIL PREVIEW — Sharing
// ===========================================================================

server.tool(
  "create_preview_share",
  "Create a shareable link for a preview test",
  { test_id: z.string().describe("The test ID to share") },
  async ({ test_id }) => {
    try {
      return ok(await mg.post("/v1/preview/sharing", { test_id }));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_preview_share",
  "Get the sharing record for a preview test",
  { test_id: z.string().describe("The test ID") },
  async ({ test_id }) => {
    try {
      return ok(await mg.get(`/v1/preview/sharing/${test_id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "update_preview_share",
  "Enable or disable a shared preview link",
  {
    test_id: z.string().describe("The test ID"),
    url_uuid: z.string().describe("The share UUID"),
    enabled: z.boolean().describe("Whether the share link should be active"),
  },
  async ({ test_id, url_uuid, enabled }) => {
    try {
      return ok(
        await mg.put(
          `/v1/preview/sharing/${test_id}?url_uuid=${url_uuid}`,
          { enabled }
        )
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "delete_preview_share",
  "Delete a shared preview link",
  {
    test_id: z.string().describe("The test ID"),
    url_uuid: z.string().describe("The share UUID"),
  },
  async ({ test_id, url_uuid }) => {
    try {
      return ok(
        await mg.delete(
          `/v1/preview/sharing/${test_id}?url_uuid=${url_uuid}`
        )
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "rotate_preview_share",
  "Regenerate the UUID and URL for a shared preview link",
  {
    test_id: z.string().describe("The test ID"),
    url_uuid: z.string().describe("The current share UUID"),
  },
  async ({ test_id, url_uuid }) => {
    try {
      return ok(
        await mg.post(
          `/v1/preview/sharing/${test_id}/rotate?url_uuid=${url_uuid}`
        )
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_public_preview_share",
  "Get a publicly shared preview test by its UUID (no auth required on the web, but uses auth through API)",
  { id: z.string().describe("The public share UUID") },
  async ({ id }) => {
    try {
      return ok(await mg.get(`/v1/preview/sharing/public/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// SPAM TESTING
// ===========================================================================

server.tool(
  "get_spam_providers",
  "Get the list of ESPs supported by spam testing, grouped by B2C and B2B",
  async () => {
    try {
      return ok(await mg.get("/v1/inspect/spam/providers"));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "create_spam_test",
  "Create a standalone spam / inbox placement test",
  {
    subject: z.string().describe("Email subject line"),
    html: z.string().describe("HTML content of the email"),
  },
  async ({ subject, html }) => {
    try {
      return ok(await mg.post("/v1/inspect/spam", { subject, html }));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "list_spam_tests",
  "List spam tests with optional filtering by status and region",
  {
    status: z.string().optional().describe("Filter by test status"),
    region: z.string().optional().describe("Filter by region"),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.status) params.set("status", args.status);
      if (args.region) params.set("region", args.region);
      const qs = params.toString();
      return ok(await mg.get(`/v1/inspect/spam${qs ? `?${qs}` : ""}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_spam_test",
  "Get the current state and results of a spam test. Poll using Retry-After header interval while processing.",
  { spam_test_id: z.string().describe("The spam test ID") },
  async ({ spam_test_id }) => {
    try {
      return ok(await mg.get(`/v1/inspect/spam/${spam_test_id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "delete_spam_test",
  "Permanently delete a spam test and its results",
  { spam_test_id: z.string().describe("The spam test ID") },
  async ({ spam_test_id }) => {
    try {
      return ok(await mg.delete(`/v1/inspect/spam/${spam_test_id}`));
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// LINK VALIDATION
// ===========================================================================

server.tool(
  "create_link_validation",
  "Create a link validation test from a list of URLs",
  {
    urls: z
      .array(z.string())
      .describe("URLs to validate"),
  },
  async ({ urls }) => {
    try {
      return ok(await mg.post("/v1/inspect/links", { urls }));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "create_link_validation_from_html",
  "Create a link validation test by extracting links from HTML content",
  { html: z.string().describe("HTML content to extract and validate links from") },
  async ({ html }) => {
    try {
      return ok(await mg.post("/v1/inspect/links/html-validate", { html }));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "list_link_validations",
  "List previous link validation tests with optional filters",
  {
    status: z.string().optional().describe("Filter by status"),
    url: z.string().optional().describe("Filter by URL"),
    statusCode: z.number().optional().describe("Filter by HTTP status code"),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.status) params.set("status", args.status);
      if (args.url) params.set("url", args.url);
      if (args.statusCode) params.set("statusCode", String(args.statusCode));
      const qs = params.toString();
      return ok(await mg.get(`/v1/inspect/links${qs ? `?${qs}` : ""}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_link_validation",
  "Get the results of a link validation test including passes, failures, and informational items",
  { id: z.string().describe("The link validation test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.get(`/v1/inspect/links/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "reprocess_link_validation",
  "Rerun an existing link validation test",
  { id: z.string().describe("The link validation test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.post(`/v1/inspect/links/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "delete_link_validation",
  "Delete a link validation test",
  { id: z.string().describe("The link validation test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.delete(`/v1/inspect/links/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "compare_link_validation_csv",
  "Compare link validation results against a spreadsheet (CSV/XLS/XLSX). Note: file upload not supported via MCP — provide the file path for reference.",
  {
    id: z.string().describe("The link validation test ID"),
  },
  async ({ id }) => {
    // CSV upload requires multipart form — returning guidance instead
    return {
      content: [
        {
          type: "text" as const,
          text: `CSV comparison for link validation ${id} requires file upload (multipart/form-data). Use the Mailgun API directly:\n\ncurl -u 'api:YOUR_KEY' -F 'csv=@file.csv' https://api.mailgun.net/v1/inspect/links/${id}/csv`,
        },
      ],
    };
  }
);

// ===========================================================================
// IMAGE VALIDATION
// ===========================================================================

server.tool(
  "create_image_validation",
  "Create an image validation test from a list of image URLs",
  {
    urls: z.array(z.string()).describe("Image URLs to validate"),
  },
  async ({ urls }) => {
    try {
      return ok(await mg.post("/v1/inspect/images", { urls }));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "create_image_validation_from_html",
  "Create an image validation test by extracting images from HTML content",
  { html: z.string().describe("HTML content to extract and validate images from") },
  async ({ html }) => {
    try {
      return ok(
        await mg.post("/v1/inspect/images/html-validate", { html })
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "list_image_validations",
  "List image validation tests with pagination",
  {
    limit: z
      .number()
      .optional()
      .describe("Results per page (max 1000, default: 100)"),
    skip: z.number().optional().describe("Number of results to skip (default: 0)"),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", String(args.limit));
      if (args.skip) params.set("skip", String(args.skip));
      const qs = params.toString();
      return ok(await mg.get(`/v1/inspect/images${qs ? `?${qs}` : ""}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_image_validation",
  "Get the results of an image validation test including dimensions, format, file size, and optimization data",
  { id: z.string().describe("The image validation test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.get(`/v1/inspect/images/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "delete_image_validation",
  "Delete an image validation test",
  { id: z.string().describe("The image validation test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.delete(`/v1/inspect/images/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "reprocess_image_validation",
  "Reprocess an image validation test",
  { id: z.string().describe("The image validation test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.post(`/v1/inspect/images/${id}/reprocess`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "optimize_images",
  "Optimize all images in a validation test",
  { id: z.string().describe("The image validation test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.post(`/v1/inspect/images/${id}/optimize`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "optimize_single_image",
  "Optimize a single image within a validation test",
  {
    id: z.string().describe("The image validation test ID"),
    image_id: z.string().describe("The specific image ID to optimize"),
  },
  async ({ id, image_id }) => {
    try {
      return ok(
        await mg.post(`/v1/inspect/images/${id}/optimize/${image_id}`)
      );
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// ACCESSIBILITY
// ===========================================================================

server.tool(
  "create_accessibility_test",
  "Submit HTML content for WCAG accessibility testing",
  { html: z.string().describe("HTML content to test for accessibility") },
  async ({ html }) => {
    try {
      return ok(
        await mg.post("/v1/inspect/accessibility", { html, encoded: false })
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "list_accessibility_tests",
  "List all accessibility tests that have been submitted",
  async () => {
    try {
      return ok(await mg.get("/v1/inspect/accessibility"));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_accessibility_test",
  "Get the detailed results of a specific accessibility test including passes and failures",
  { id: z.string().describe("The accessibility test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.get(`/v1/inspect/accessibility/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "delete_accessibility_test",
  "Delete an accessibility test",
  { id: z.string().describe("The accessibility test ID") },
  async ({ id }) => {
    try {
      return ok(await mg.delete(`/v1/inspect/accessibility/${id}`));
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// CODE ANALYSIS
// ===========================================================================

server.tool(
  "get_code_analysis_dictionary",
  "Get the lookup dictionary of variants, clients, platforms, support levels, and categories used in code analysis",
  async () => {
    try {
      return ok(await mg.get("/v1/inspect/analyze/dictionary"));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "create_code_analysis",
  "Create a code analysis test to analyze HTML email content for client compatibility issues",
  { html: z.string().describe("HTML email content to analyze") },
  async ({ html }) => {
    try {
      return ok(await mg.post("/v1/inspect/analyze", { html }));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "list_code_analyses",
  "List all code analysis jobs (shows latest version of each test)",
  {
    status: z.string().optional().describe("Filter by status"),
    limit: z.number().optional().describe("Results per page"),
    skip: z.number().optional().describe("Number to skip"),
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.status) params.set("status", args.status);
      if (args.limit) params.set("limit", String(args.limit));
      if (args.skip) params.set("skip", String(args.skip));
      const qs = params.toString();
      return ok(await mg.get(`/v1/inspect/analyze${qs ? `?${qs}` : ""}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_code_analysis",
  "Get the latest version of code analysis results for a test",
  { test_id: z.string().describe("The code analysis test ID") },
  async ({ test_id }) => {
    try {
      return ok(await mg.get(`/v1/inspect/analyze/${test_id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "create_code_analysis_version",
  "Create a new version of an existing code analysis test with updated HTML",
  {
    test_id: z.string().describe("The existing code analysis test ID"),
    html: z.string().describe("Updated HTML content to analyze"),
  },
  async ({ test_id, html }) => {
    try {
      return ok(await mg.post(`/v1/inspect/analyze/${test_id}`, { html }));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "delete_code_analysis",
  "Delete all versions of a code analysis test",
  { test_id: z.string().describe("The code analysis test ID") },
  async ({ test_id }) => {
    try {
      return ok(await mg.delete(`/v1/inspect/analyze/${test_id}`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "get_code_analysis_version",
  "Get code analysis results for a specific version of a test",
  {
    test_id: z.string().describe("The code analysis test ID"),
    version_id: z.string().describe("The version ID"),
  },
  async ({ test_id, version_id }) => {
    try {
      return ok(
        await mg.get(
          `/v1/inspect/analyze/${test_id}/versions/${version_id}`
        )
      );
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "list_code_analysis_versions",
  "List all versions of a code analysis test",
  { test_id: z.string().describe("The code analysis test ID") },
  async ({ test_id }) => {
    try {
      return ok(await mg.get(`/v1/inspect/analyze/${test_id}/versions`));
    } catch (e) {
      return err(e);
    }
  }
);

server.tool(
  "resolve_code_analysis_issue",
  "Mark a specific code analysis issue as resolved or unresolved",
  {
    test_id: z.string().describe("The code analysis test ID"),
    issue_id: z.string().describe("The specific issue/instance ID to resolve"),
    resolved: z.boolean().describe("Whether to mark as resolved (true) or unresolved (false)"),
  },
  async ({ test_id, issue_id, resolved }) => {
    try {
      return ok(
        await mg.post(`/v1/inspect/analyze/${test_id}/resolve/${issue_id}`, {
          resolved,
        })
      );
    } catch (e) {
      return err(e);
    }
  }
);

// ===========================================================================
// Start
// ===========================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
