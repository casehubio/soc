-- V5000: soc_ledger_entry — SOC compliance audit trail
-- Extends ledger_entry (JOINED inheritance). V5000+ reserved by casehub-soc.

CREATE TABLE soc_ledger_entry (
    id            UUID         NOT NULL,
    incident_id   UUID         NOT NULL,
    step_type     VARCHAR(30)  NOT NULL,
    CONSTRAINT pk_soc_ledger_entry PRIMARY KEY (id),
    CONSTRAINT fk_soc_ledger_entry FOREIGN KEY (id) REFERENCES ledger_entry(id)
);

CREATE INDEX idx_sle_incident_id ON soc_ledger_entry (incident_id);
CREATE INDEX idx_sle_step_type ON soc_ledger_entry (step_type);
