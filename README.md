# Mailgun Inspect MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that wraps the [Mailgun Inspect API](https://documentation.mailgun.com/docs/inspect/api-reference/api-overview), giving AI assistants the ability to preview emails across 100+ clients, run spam/inbox placement tests, validate links and images, check accessibility compliance, and analyze HTML for email client compatibility.

Mailgun Inspect is the next generation of [Email on Acid](https://github.com/sam-david/email-on-acid-mcp), fully integrated into the Mailgun platform.

## Setup

### Prerequisites

- Node.js 18+
- A Mailgun account with Inspect access
- Your **Mailgun Private API Key** (found in Mailgun Dashboard > Account Settings > API Keys)

### Install and build

```bash
git clone https://github.com/sam-david/mailgun-mcp.git
cd mailgun-mcp
npm install
npm run build
```

### Configure in Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "mailgun-inspect": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mailgun-mcp/dist/index.js"],
      "env": {
        "MAILGUN_API_KEY": "your-private-api-key",
        "MAILGUN_REGION": "us"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAILGUN_API_KEY` | Yes | | Your Mailgun Private API Key |
| `MAILGUN_REGION` | No | `us` | API region: `us` (api.mailgun.net) or `eu` (api.eu.mailgun.net) |

## Tools (54)

### Email Preview (15 tools)

| Tool | Description |
|------|-------------|
| `get_preview_clients` | Get all available email clients for preview testing. Returns client IDs, names, OS, category (Web/Application/Mobile), browser, and whether they support image blocking or dark mode. |
| `create_preview_test` | Create a new email preview test. Requires `subject` and either `html` or `url`. Optionally specify `clients`, enable `image_blocking`, and turn on content checking (`link_validation`, `image_validation`, `accessibility`, `code_analysis`) to run all checks in a single test. |
| `create_preview_test_with_spam` | Same as `create_preview_test` but also runs spam/inbox placement checks. Configure via `spam_test_method`, `spam_from_address`, SMTP credentials, or seed list key. |
| `list_preview_tests` | List/search email preview tests with optional filters: date range (`from`/`to`), `subject` (case-insensitive), `customer_id`, and pagination (`results`, `page`). Tests retained for 90 days. |
| `get_preview_test` | Get test info including subject, submission date, per-client status (`completed`/`processing`/`bounced`), and content checking results. |
| `delete_preview_test` | Permanently delete a preview test and all associated content checking data. |
| `get_preview_test_results` | Get screenshot results for a specific client. Returns screenshot URLs, thumbnails, send/completion timestamps, and bounce details. |
| `get_preview_test_all_results` | Get screenshot results for ALL clients in a test at once (v1 endpoint). |
| `reprocess_preview_screenshots` | Request a retake of screenshots for specific clients. Useful when results look off. |
| `get_preview_test_content` | Get the original HTML content submitted for a test. |
| `get_preview_test_content_inlined` | Get the HTML with all CSS inlined. |
| `get_preview_test_content_text` | Get a plain-text approximation of the email. |
| `create_preview_export` | Create an export job that packages screenshots into a downloadable zip. Returns a `job_id` to poll. |
| `get_preview_export` | Get the status and download URL of an export job. Pass `job_id` for a specific job, or omit to get the latest. |
| `generate_preview_address` | Generate or retrieve your account's dedicated preview email address. Send emails directly to this address for automatic testing. |

### Preview Sharing (6 tools)

| Tool | Description |
|------|-------------|
| `create_preview_share` | Create a shareable link for a preview test that can be viewed without authentication. |
| `get_preview_share` | Get the sharing record for a test including the share URL, UUID, enabled status, and expiration. |
| `update_preview_share` | Enable or disable an existing shared link. |
| `delete_preview_share` | Delete a shared link. |
| `rotate_preview_share` | Regenerate the UUID and URL for a shared link, invalidating the old one. |
| `get_public_preview_share` | Retrieve a shared preview test's results by its public UUID. |

### Spam Testing (5 tools)

| Tool | Description |
|------|-------------|
| `get_spam_providers` | Get the list of supported email service providers for spam testing, grouped by B2C and B2B. |
| `create_spam_test` | Create a standalone inbox placement test. Provide `subject` and `html`. Returns immediately with `status=processing`; poll with `get_spam_test` using the Retry-After interval. |
| `list_spam_tests` | List spam tests with optional filters by `status` and `region`. |
| `get_spam_test` | Get the current state and results of a spam test. |
| `delete_spam_test` | Permanently delete a spam test and its results. |

### Link Validation (7 tools)

| Tool | Description |
|------|-------------|
| `create_link_validation` | Validate a list of URLs. Checks HTTP status, redirect chains with timing, content type, content length, and SSL certificate status. |
| `create_link_validation_from_html` | Extract all links from HTML content and validate them. |
| `list_link_validations` | List previous link validation tests with optional filters by `status`, `url`, or `statusCode`. |
| `get_link_validation` | Get results of a link validation test including passes, failures, and informational items. |
| `reprocess_link_validation` | Rerun an existing link validation test. |
| `delete_link_validation` | Delete a link validation test. |
| `compare_link_validation_csv` | Compare link validation results against a spreadsheet. (Note: file upload requires direct API usage.) |

### Image Validation (8 tools)

| Tool | Description |
|------|-------------|
| `create_image_validation` | Validate a list of image URLs. Reports dimensions, file type, file size, format, frame count, animation duration, color depth, and transparency. |
| `create_image_validation_from_html` | Extract all images from HTML content and validate them. |
| `list_image_validations` | List image validation tests with pagination (`limit`, `skip`). |
| `get_image_validation` | Get results of an image validation test. |
| `delete_image_validation` | Delete an image validation test. |
| `reprocess_image_validation` | Reprocess an existing image validation test. |
| `optimize_images` | Optimize all images in a validation test. Returns optimized versions with reduced file sizes. |
| `optimize_single_image` | Optimize a specific image within a validation test. |

### Accessibility (4 tools)

| Tool | Description |
|------|-------------|
| `create_accessibility_test` | Submit HTML content for WCAG accessibility evaluation. Returns a job ID for polling. |
| `list_accessibility_tests` | List all accessibility tests with pass/fail counts. |
| `get_accessibility_test` | Get detailed results of an accessibility test including individual checks, passes, and failures. |
| `delete_accessibility_test` | Delete an accessibility test. |

### Code Analysis (9 tools)

| Tool | Description |
|------|-------------|
| `get_code_analysis_dictionary` | Get the lookup dictionary of email client variants, platforms, support levels, and categories used in analysis results. |
| `create_code_analysis` | Analyze HTML email content for compatibility issues across email clients. Flags unsupported CSS properties, HTML elements, and rendering quirks. |
| `list_code_analyses` | List all code analysis jobs (latest version of each). Filter by `status`, paginate with `limit`/`skip`. |
| `get_code_analysis` | Get the latest version of code analysis results for a test. |
| `create_code_analysis_version` | Submit updated HTML to create a new version of an existing analysis. Lets you track improvements across iterations. |
| `delete_code_analysis` | Delete all versions of a code analysis test. |
| `get_code_analysis_version` | Get results for a specific version of a code analysis test. |
| `list_code_analysis_versions` | List all versions of a code analysis test. |
| `resolve_code_analysis_issue` | Mark a specific compatibility issue as resolved or unresolved. |

## Typical Workflow

### Email preview

1. **Create a test** with `create_preview_test` — pass your HTML and subject, optionally enable all content checks at once
2. **Poll status** with `get_preview_test` until clients move from `processing` to `completed`
3. **Get screenshots** with `get_preview_test_results` or `get_preview_test_all_results`
4. **Share results** with `create_preview_share` to get a link for teammates
5. **Export** with `create_preview_export` to download a zip of all screenshots

### Pre-send QA

1. **Create a test with all checks** — set `link_validation`, `image_validation`, `accessibility`, and `code_analysis` to `true`
2. **Review results** from `get_preview_test` which includes content checking outcomes
3. **Dive deeper** into any category using the standalone tools (`get_link_validation`, `get_accessibility_test`, etc.)
4. **Fix and re-test** — use `create_code_analysis_version` to track improvement across iterations

## API Reference

- [Mailgun Inspect API Documentation](https://documentation.mailgun.com/docs/inspect/api-reference/api-overview)
- [Mailgun Inspect Overview](https://documentation.mailgun.com/docs/inspect/overview)

## License

ISC
