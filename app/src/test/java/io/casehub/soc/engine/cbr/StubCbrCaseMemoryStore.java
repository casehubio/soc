package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.EraseRequest;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.*;
import io.casehub.platform.api.path.Path;

import java.util.List;

public class StubCbrCaseMemoryStore implements CbrCaseMemoryStore {
    @Override public void registerSchema(CbrFeatureSchema schema) {}
    @Override public String store(CbrCase c, String t, String e, MemoryDomain d, String tid, String cid, Path s) { return cid; }
    @Override public <C extends CbrCase> List<ScoredCbrCase<C>> retrieveSimilar(CbrQuery q, Class<C> t) { return List.of(); }
    @Override public Integer erase(EraseRequest r) { return 0; }
    @Override public Integer eraseEntity(String e, String t) { return 0; }
    @Override public Integer eraseByScope(Path s, String t) { return 0; }
    @Override public void recordOutcome(String c, String t, CbrOutcome o) {}
    @Override public Integer purge(CbrRetentionPolicy p) { return 0; }
    @Override public void supersede(String c, String t, String s, String r) {}
    @Override public void reinstate(String c, String t) {}
    @Override public SupersessionStatus getSupersessionStatus(String c, String t) { return null; }
    @Override public List<SupersessionStatus> findSupersededCases(String t, MemoryDomain d) { return List.of(); }
}
