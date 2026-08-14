package io.casehub.soc.engine.cbr;

import io.casehub.api.model.cbr.CbrCaseTypeRegistration;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SocCbrCaseTypeRegistration implements CbrCaseTypeRegistration {
    @Override public String cbrType() { return SocIncidentCbrCase.CBR_TYPE; }
    @Override public Class<?> caseClass() { return SocIncidentCbrCase.class; }
}
