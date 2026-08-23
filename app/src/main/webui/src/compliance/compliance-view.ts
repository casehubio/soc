import { rows, html as pagesHtml } from "@casehubio/pages-ui";
import type { Component } from "@casehubio/pages-ui";
import "@casehubio/blocks-ui-compliance-summary";
import "@casehubio/blocks-ui-gdpr-erasure-action";
import "./soc-audit-trail.js";

export function complianceView(): Component {
  return rows(auditTrail(), complianceSummary(), gdprErasure());
}

function auditTrail(): Component {
  return pagesHtml(
    `<soc-audit-trail endpoint="/api/soc/compliance"></soc-audit-trail>`
  );
}

function complianceSummary(): Component {
  return pagesHtml(
    `<blocks-compliance-summary endpoint="/api/soc/compliance/summary"></blocks-compliance-summary>`
  );
}

function gdprErasure(): Component {
  return pagesHtml(
    `<blocks-gdpr-erasure-action
       endpoint="/api/soc/compliance/erasure"
       subject-label="Actor"
     ></blocks-gdpr-erasure-action>`
  );
}
