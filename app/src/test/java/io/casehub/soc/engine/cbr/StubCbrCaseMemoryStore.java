package io.casehub.soc.engine.cbr;

import io.casehub.neocortex.memory.EraseRequest;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.cbr.*;
import io.casehub.platform.api.path.Path;

import java.util.List;

public class StubCbrCaseMemoryStore implements CbrRecordStore {
    @Override public void registerSchema(CbrRecordSchema schema) {}
    @Override public String store(CbrRecord c, String t, String e, MemoryDomain d, String tid, String cid, Path s) { return cid; }
    @Override public <C extends CbrRecord> List<CbrMatch<C>> retrieveSimilar(CbrQuery q, Class<C> t) { return List.of(); }
    @Override public Integer erase(EraseRequest r) { return 0; }
    @Override public Integer eraseEntity(String e, String t) { return 0; }
    @Override public Integer eraseByScope(Path s, String t) { return 0; }
    @Override public void recordOutcome(String c, String t, CbrOutcome o) {}
    @Override public Integer purge(CbrRetentionPolicy p) { return 0; }
    @Override public java.util.List<String> findCaseIds(String t, MemoryDomain d, String e, java.util.Map<String, io.casehub.neocortex.memory.cbr.CbrFilter> f) { return java.util.List.of(); }
    @Override public int reinstateAll(java.util.Collection<String> c, String t) { return 0; }
    @Override public int reinstateMatching(String t, MemoryDomain d, String e, java.util.Map<String, CbrFilter> f) { return 0; }
    @Override public int supersedeMatching(String t, MemoryDomain d, String e, java.util.Map<String, CbrFilter> f, String r) { return 0; }
    @Override public int supersedeAll(java.util.Collection<String> c, String t, String r) { return 0; }
    @Override public boolean supersede(String c, String t, String s, String r) { return true; }
    @Override public boolean reinstate(String c, String t) { return true; }
    @Override public SupersessionStatus getSupersessionStatus(String c, String t) { return null; }
    @Override public List<SupersessionStatus> findSupersededCases(String t, MemoryDomain d) { return List.of(); }
}
